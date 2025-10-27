import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';

const CVGraph = ({ data }) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  // Renk Sabitleri - TEK RENK
  const DEFAULT_NODE_COLOR = '#4A90E2'; // Mavi (Varsayılan/CV 1)
  const DEFAULT_BORDER_COLOR = '#2E5C8A';
  const CV2_NODE_COLOR = '#00A86B'; // Yeşil (CV 2)
  const MERGED_NODE_COLOR = '#D0021B'; // Kırmızı (Ortak Düğüm)
  const HIGHLIGHT_NODE_COLOR = '#F5A623'; // Vurgu Rengi (Turuncu)
  const HIGHLIGHT_BORDER_COLOR = '#D0021B'; // Vurgu Kenarlık Rengi (Kırmızı)
  const DEFAULT_EDGE_COLOR = '#848484';
  const HIGHLIGHT_EDGE_COLOR = '#4A90E2'; // Edge Vurgu Rengi

  useEffect(() => {
    if (!data || !containerRef.current) return;

    // Tüm node'lar için başlangıç ayarları
    const nodes = data.nodes.map(node => {
      const { level, ...nodeWithoutLevel } = node;
      
      let nodeBgColor = DEFAULT_NODE_COLOR;
      let nodeBorderColor = DEFAULT_BORDER_COLOR;
      let fontColor = '#ffffff';

      // Çoklu CV'de kişilere ve ortak düğümlere özel renkler
      if (node.id.startsWith('person_2') || (node.type === 'person' && node.id === 'person_2')) {
        nodeBgColor = CV2_NODE_COLOR;
      } else if (node.id.startsWith('person_1') || (node.type === 'person' && node.id === 'person_1')) {
        nodeBgColor = DEFAULT_NODE_COLOR;
      } else if (node.id.startsWith('merged_') || node.color === MERGED_NODE_COLOR) {
        nodeBgColor = MERGED_NODE_COLOR;
        nodeBorderColor = '#9B0012';
        fontColor = '#ffffff'; 
      }
      
      // Tekil CV durumunda standart renk
      if (!node.id.startsWith('person_')) {
          if (node.type === 'skill' || node.type === 'language' || node.type === 'interest') {
              nodeBgColor = '#667eea';
          }
      }

      return {
        ...nodeWithoutLevel,
        shape: 'dot',
        color: {
          background: nodeBgColor,
          border: nodeBorderColor,
          highlight: {
            background: HIGHLIGHT_NODE_COLOR, 
            border: HIGHLIGHT_BORDER_COLOR
          }
        },
        font: { color: fontColor, size: 14, bold: true },
        title: node.title || node.label,
        borderWidth: 2,
        borderWidthSelected: 4,
      };
    });

    // Graf verisi
    const graphData = {
      nodes: nodes,
      edges: data.edges
    };

    // Rhiyerarşik LAYOUT
const options = {
  nodes: {
    size: 25,
    borderWidthSelected: 4, // Seçildiğinde daha kalın kenarlık
  },
  edges: {
    width: 2,
    color: { color: DEFAULT_EDGE_COLOR, highlight: HIGHLIGHT_EDGE_COLOR },
    smooth: {
      type: 'continuous',
      roundness: 0.5
    },
    arrows: 'to' // Yön: Bağlantının nereden nereye olduğunu gösterir
  },
  
  // 💡 HİYERARŞİK DÜZEN AYARLARI
  layout: {
    hierarchical: {
      enabled: true,           // Hiyerarşik düzeni etkinleştir
      direction: 'UD',         // Yön: Soldan Sağa ('LR') daha iyi görünür
      sortMethod: 'directed',  // Sıralama yöntemi: Kenar yönüne göre sırala
      levelSeparation: 200,    // Seviyeler arasındaki boşluk artırıldı
      nodeSpacing: 100,
      treeSpacing: 250,        // Birden fazla ana düğüm (2 kişi) varsa aradaki boşluk
    }
  },
  
  // 💡 FİZİK AYARLARI
  physics: {
    enabled: false, // Hiyerarşik düzen kullanılırken fizik motoru KAPATILIR
    stabilization: {
      enabled: true, 
      iterations: 10
    }
  },
  
  interaction: {
    hover: true,
    tooltipDelay: 200,
    zoomView: true,
    dragView: true
  }
};

    // Network'ü oluştur
    networkRef.current = new Network(containerRef.current, graphData, options);

    // Stabilization bittiğinde yakınlaştır
    networkRef.current.once('stabilizationIterationsDone', () => {
      networkRef.current.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
    });

    // Tıklama olayını yönetim
    networkRef.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        highlightConnectedNodes(clickedNodeId);
      } else {
        resetHighlight();
      }
    });

    // Bağlantılı node'ları vurgulama fonksiyonu
    function highlightConnectedNodes(nodeId) {
      // Tüm düğüm verilerini al
      const allNodes = networkRef.current.body.data.nodes.get();
      // Tıklanan düğüme bağlı olan düğümleri ve kenarları al
      const connectedNodeIds = networkRef.current.getConnectedNodes(nodeId);
      const highlightNodeIds = new Set([nodeId, ...connectedNodeIds]);
      
      const nodesToUpdate = [];
      
      allNodes.forEach(node => {
        const isHighlighted = highlightNodeIds.has(node.id);
        
        // Varsayılan renkleri dinamik olarak yeniden belirle (filtre veya merge sonrası doğru rengi korumak için)
        let defaultBgColor = DEFAULT_NODE_COLOR;
        let defaultBorderColor = DEFAULT_BORDER_COLOR;
        let defaultFontSize = 14;
        let defaultBorderWidth = 2;

        if (node.id.startsWith('person_2')) {
            defaultBgColor = CV2_NODE_COLOR;
        } else if (node.id.startsWith('merged_') || node.color.background === MERGED_NODE_COLOR) {
            defaultBgColor = MERGED_NODE_COLOR;
            defaultBorderColor = '#9B0012';
        }
        // Eğer düğümün tipi skill, language ise yine varsayılan mavi tonunu kullan (eğer merge'lenmemişse)
        else if (node.type === 'skill' || node.type === 'language' || node.type === 'interest') {
            defaultBgColor = '#667eea'; 
        }

        nodesToUpdate.push({
          id: node.id,
          color: {
            background: isHighlighted ? HIGHLIGHT_NODE_COLOR : defaultBgColor,
            border: isHighlighted ? HIGHLIGHT_BORDER_COLOR : defaultBorderColor,
            highlight: {
                background: isHighlighted ? HIGHLIGHT_NODE_COLOR : defaultBgColor,
                border: isHighlighted ? HIGHLIGHT_BORDER_COLOR : defaultBorderColor
            }
          },
          size: isHighlighted ? 35 : 25,
          borderWidth: isHighlighted ? 4 : defaultBorderWidth,
          font: { 
            color: '#ffffff', 
            size: isHighlighted ? 16 : defaultFontSize,
            bold: isHighlighted 
          }
        });
      });
      
      networkRef.current.body.data.nodes.update(nodesToUpdate);

      const edgesToUpdate = [];
      networkRef.current.body.data.edges.get().forEach(edge => {
        const isDirectConnection = edge.from === nodeId || edge.to === nodeId;
        
        edgesToUpdate.push({
          id: edge.id,
          color: {
            color: isDirectConnection ? HIGHLIGHT_EDGE_COLOR : DEFAULT_EDGE_COLOR,
            highlight: isDirectConnection ? HIGHLIGHT_EDGE_COLOR : DEFAULT_EDGE_COLOR
          },
          width: isDirectConnection ? 4 : 2,
        });
      });
      
      networkRef.current.body.data.edges.update(edgesToUpdate);
    }

    // Vurgulamayı sıfırlama fonksiyonu
    function resetHighlight() {
      const nodesToUpdate = [];
      networkRef.current.body.data.nodes.get().forEach(node => {
        
        let defaultBgColor = DEFAULT_NODE_COLOR;
        let defaultBorderColor = DEFAULT_BORDER_COLOR;
        
        if (node.id.startsWith('person_2')) {
            defaultBgColor = CV2_NODE_COLOR;
        } else if (node.id.startsWith('merged_') || node.color.background === MERGED_NODE_COLOR) {
            defaultBgColor = MERGED_NODE_COLOR;
            defaultBorderColor = '#9B0012';
        }
        else if (node.type === 'skill' || node.type === 'language' || node.type === 'interest') {
            defaultBgColor = '#667eea'; 
        }
        
        nodesToUpdate.push({
          id: node.id,
          size: 25,
          borderWidth: 2,
          color: {
              background: defaultBgColor,
              border: defaultBorderColor,
          },
          font: { color: '#ffffff', size: 14, bold: true }
        });
      });
      networkRef.current.body.data.nodes.update(nodesToUpdate);

      const edgesToUpdate = [];
      networkRef.current.body.data.edges.get().forEach(edge => {
        edgesToUpdate.push({
          id: edge.id,
          width: 2,
          color: { color: DEFAULT_EDGE_COLOR, highlight: DEFAULT_EDGE_COLOR }
        });
      });
      networkRef.current.body.data.edges.update(edgesToUpdate);
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#1a1a1a'
      }} 
    />
  );
};

export default CVGraph;
