import React, { useState, useEffect } from 'react';
import CVGraph from './components/CVGraph';
import { convertToGraphFormat } from './utils/jsonConverter';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);

  // JSON verisini yükle
  useEffect(() => {
    fetch('/complete-cv-data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Veri yüklenemedi');
        }
        return response.json();
      })
      .then(data => {
        processJsonData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // JSON verisini işle ve formatı algıla
  const processJsonData = (data) => {
    try {
      const convertedData = convertToGraphFormat(data);
      setOriginalData(convertedData);
      setGraphData(convertedData);
      extractYears(convertedData);
      setError(null);
    } catch (err) {
      setError(`Format dönüştürme hatası: ${err.message}`);
      console.error('Dönüştürme hatası:', err);
    }
  };

  // Yılları çıkar
  const extractYears = (data) => {
    const years = new Set();
    data.nodes.forEach(node => {
      // Sadece zaman bilgisi olan ana düğümleri dikkate al
      if (node.startDate) {
        const startYear = new Date(node.startDate).getFullYear();
        if (!isNaN(startYear)) years.add(startYear);
      }
      if (node.endDate && node.endDate !== 'Devam Ediyor') {
        const endYear = new Date(node.endDate).getFullYear();
        if (!isNaN(endYear)) years.add(endYear);
      }
    });
    const sortedYears = Array.from(years).sort((a, b) => b - a); // En yeniden en eskiye sırala
    setAvailableYears(sortedYears);
  };

  // Yıl filtresini uygula
  const filterByYear = (year) => {
    setSelectedYear(year);
    
    if (year === 'all' || !originalData) {
      setGraphData(originalData);
      return;
    }

    const selectedYearNum = parseInt(year);
    if (isNaN(selectedYearNum)) {
      setGraphData(originalData);
      return;
    }
    
    // 1. Adım: Yıl filtresine uyan ana düğümleri bul (İş, Eğitim, Ödül vb.)
    const yearFilteredPrimaryNodes = originalData.nodes.filter(node => {
      // Kişi düğümü (person) her zaman tutulacak
      if (node.type === 'person') return true;

      // Zaman aralığı olan düğümler (work, education, awards, projects, certificates, publications)
      const isTimeBoundNode = node.startDate || node.endDate;

      if (isTimeBoundNode) {
        const startYear = node.startDate ? new Date(node.startDate).getFullYear() : -Infinity;
        const endDateValue = node.endDate === 'Devam Ediyor' ? new Date().getFullYear() : node.endDate;
        const endYear = endDateValue ? new Date(endDateValue).getFullYear() : Infinity;

        // Seçilen yıl, düğümün zaman aralığına düşüyor mu?
        return selectedYearNum >= startYear && selectedYearNum <= endYear;
      }
      // Zaman aralığı olmayan diğer düğümler (skill, language vb.) bu aşamada atlanır
      return false; 
    });

    const timeNodeIds = new Set(yearFilteredPrimaryNodes.map(n => n.id));
    
    // 2. Adım: Filtrelenmiş kenarları bul
    const initialEdges = originalData.edges.filter(edge => 
      timeNodeIds.has(edge.from) && timeNodeIds.has(edge.to)
    );
    
    // 3. Adım: Tüm nihai düğümleri topla (Person + Filtrelenmiş Zaman Düğümleri + Bağlantılı İkincil Düğümler)
    
    let finalNodeIds = new Set(timeNodeIds);
    
    // İkinci adım: Filtrelenmiş zaman düğümlerine bağlı ikincil (skills, achievements vb.) düğümleri ekle
    originalData.edges.forEach(edge => {
        // Eğer edge'in bir ucu filtrelenmiş zaman düğümlerinden biriyse, diğer ucu da ekle
        if (timeNodeIds.has(edge.from) && !finalNodeIds.has(edge.to)) {
            // from düğümü filtrelenmiş (örneğin company), to düğümü ise eklenmemiş (örneğin skill)
            const nodeToAdd = originalData.nodes.find(n => n.id === edge.to);
            // Sadece person olmayan ve zaman aralığı olmayan ikincil düğümleri ekle (skill, position, achievement vb.)
            if (nodeToAdd && nodeToAdd.type !== 'person' && !nodeToAdd.startDate && !nodeToAdd.endDate) {
                 finalNodeIds.add(edge.to);
            }
        }
        if (timeNodeIds.has(edge.to) && !finalNodeIds.has(edge.from)) {
            // to düğümü filtrelenmiş, from düğümü eklenmemiş
            const nodeToAdd = originalData.nodes.find(n => n.id === edge.from);
             if (nodeToAdd && nodeToAdd.type !== 'person' && !nodeToAdd.startDate && !nodeToAdd.endDate) {
                 finalNodeIds.add(edge.from);
            }
        }
    });
    
    // Eklenen ikincil düğümlerin bağlantılarını da finalNodeIds setine ekle (özellikle Person -> Skill bağlantıları)
    const finalNodes = originalData.nodes.filter(node => finalNodeIds.has(node.id));
    
    const finalEdges = originalData.edges.filter(edge => 
      finalNodeIds.has(edge.from) && finalNodeIds.has(edge.to)
    );
    
    setGraphData({
      nodes: finalNodes,
      edges: finalEdges
    });
  };

  // Dosya yükleme fonksiyonu
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          processJsonData(json);
          setSelectedYear('all');
        } catch (err) {
          setError('Geçersiz JSON formatı: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">
          <h2>❌ Hata</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 CV İlişki Graf Görselleştirme</h1>
        <div className="controls">
          <label className="file-upload-btn">
            📁 JSON Yükle
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          {/* Tarih Filtresi */}
          <div className="year-filter">
            <label htmlFor="year-select">📅 Yıl:</label>
            <select 
              id="year-select"
              value={selectedYear} 
              onChange={(e) => filterByYear(e.target.value)}
              className="year-select"
            >
              <option value="all">Tüm Yıllar</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {selectedYear !== 'all' && (
            <div className="filter-info">
              <span className="active-filter">
                🔍 Aktif Yıl: {selectedYear}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="graph-container">
        {/* key={selectedYear} ile data değişimi zorlanarak grafiğin yeniden çizilmesi sağlanır */}
        {graphData && <CVGraph data={graphData} key={selectedYear} />} 
      </main>

      <footer className="info-section">
        <div className="info-box">
          <h3>📊 Graf Hakkında</h3>
          <p>Bu graf, bir CV'deki tüm bilgileri görsel olarak gösterir:</p>
          <ul>
            <li>👤 Kişi bilgileri</li>
            <li>🏢 Şirketler ve iş deneyimi</li>
            <li>🎓 Eğitim geçmişi</li>
            <li>🏆 Sertifikalar ve ödüller</li>
            <li>💻 Teknik beceriler</li>
            <li>🚀 Projeler</li>
            <li>🌍 Diller</li>
            <li>❤️ İlgi alanları</li>
          </ul>
        </div>
        <div className="info-box">
          <h3>🎮 Kullanım</h3>
          <ul>
            <li>🖱️ <strong>Tıklama:</strong> Düğüme tıklayarak bağlantıları görün</li>
            <li>🔍 <strong>Zoom:</strong> Fare tekerleği ile yakınlaştırın</li>
            <li>👆 <strong>Sürükle:</strong> Grafı hareket ettirin</li>
            <li>ℹ️ <strong>Hover:</strong> Detay bilgi görün</li>
            <li>📅 <strong>Filtre:</strong> Yıl seçerek zaman yolculuğu yapın</li>
            <li>📁 <strong>JSON Yükle:</strong> Farklı formatlar otomatik algılanır</li>
          </ul>
        </div>
        <div className="info-box">
          <h3>🔄 Desteklenen Formatlar</h3>
          <p>Sistem otomatik olarak şu formatları algılar:</p>
          <ul>
            <li>✓ Standart CV JSON</li>
            <li>✓ LinkedIn export</li>
            <li>✓ JSON Resume standard</li>
            <li>✓ Europass format</li>
            <li>✓ Graph format (nodes & edges)</li>
          </ul>
          <p><strong>Herhangi bir formatı yükleyin, otomatik dönüştürülsün!</strong></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
