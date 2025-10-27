// JSON Format Converter Utility
// Farklı CV formatlarını graph formatına çevirir

/**
 * Ana dönüştürme fonksiyonu
 * JSON formatını otomatik algılar ve graph formatına çevirir
 */
export const convertToGraphFormat = (jsonData) => {
  // Format tipini algıla
  const formatType = detectFormat(jsonData);
  
  console.log('Algılanan format:', formatType);
  
  switch (formatType) {
    case 'GRAPH_FORMAT':
      return jsonData; // Zaten doğru format
    
    case 'STANDARD_CV':
      return convertStandardCVFormat(jsonData);
    
    case 'LINKEDIN_STYLE':
      return convertLinkedInFormat(jsonData);
    
    case 'EUROPASS_STYLE':
      return convertEuropassFormat(jsonData);
    
    case 'JSON_RESUME':
      return convertJSONResumeFormat(jsonData);
    
    case 'HIERARCHICAL':
      return convertHierarchicalFormat(jsonData);
    
    default:
      throw new Error('Bilinmeyen JSON formatı. Desteklenen formatları kontrol edin.');
  }
};

/**
 * JSON formatını algıla
 */
const detectFormat = (data) => {
  // Graph formatı kontrolü (nodes ve edges var mı?)
  if (data.nodes && data.edges && Array.isArray(data.nodes)) {
    return 'GRAPH_FORMAT';
  }
  
  // JSON Resume formatı (basics, work, education var mı?)
  if (data.basics && data.work && data.education) {
    return 'JSON_RESUME';
  }
  
  // LinkedIn tarzı format
  if (data.profile && data.positions && data.educations) {
    return 'LINKEDIN_STYLE';
  }
  
  // Europass formatı
  if (data.learnerInfo || (data.firstName && data.workExperience)) {
    return 'EUROPASS_STYLE';
  }
  
  // Standart CV formatı
  if (data.personalInfo && (data.experience || data.workExperience)) {
    return 'STANDARD_CV';
  }
  
  // Hiyerarşik format (nested yapı)
  if (data.person && typeof data.person === 'object') {
    return 'HIERARCHICAL';
  }
  
  return 'UNKNOWN';
};

/**
 * 1. Standart CV Formatı Dönüştürücü
 * Format: { personalInfo: {}, experience: [], education: [], skills: [] }
 */
const convertStandardCVFormat = (data) => {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 0;
  
  const generateId = (prefix) => `${prefix}_${nodeIdCounter++}`;
  
  // Kişi node'u oluştur
  const personId = generateId('person');
  nodes.push({
    id: personId,
    label: data.personalInfo?.name || 'İsimsiz',
    type: 'person',
    title: `Kişi: ${data.personalInfo?.name || 'İsimsiz'}`,
    email: data.personalInfo?.email,
    phone: data.personalInfo?.phone,
    location: data.personalInfo?.location
  });
  
  // İş deneyimleri
  if (data.experience || data.workExperience) {
    const experiences = data.experience || data.workExperience;
    experiences.forEach((exp) => {
      const companyId = generateId('company');
      nodes.push({
        id: companyId,
        label: exp.company || exp.employer,
        type: 'company',
        title: `Şirket: ${exp.company || exp.employer}`,
        startDate: exp.startDate || exp.from,
        endDate: exp.endDate || exp.to || 'Devam Ediyor'
      });
      edges.push({ from: personId, to: companyId });
      
      // Pozisyon node'u
      if (exp.position || exp.title) {
        const positionId = generateId('position');
        nodes.push({
          id: positionId,
          label: exp.position || exp.title,
          type: 'position',
          title: `Pozisyon: ${exp.position || exp.title}`,
          description: exp.description || exp.responsibilities,
          startDate: exp.startDate || exp.from,
          endDate: exp.endDate || exp.to || 'Devam Ediyor'
        });
        edges.push({ from: companyId, to: positionId });
      }
    });
  }
  
  // Eğitim
  if (data.education) {
    data.education.forEach((edu) => {
      const eduId = generateId('education');
      nodes.push({
        id: eduId,
        label: edu.school || edu.institution,
        type: 'education',
        title: `Eğitim: ${edu.school || edu.institution} - ${edu.degree || edu.studyType || ''}`,
        degree: edu.degree || edu.studyType,
        field: edu.field || edu.area,
        startDate: edu.startDate || edu.from,
        endDate: edu.endDate || edu.to
      });
      edges.push({ from: personId, to: eduId });
    });
  }
  
  // Beceriler
  if (data.skills) {
    const skills = Array.isArray(data.skills) ? data.skills : 
                   (data.skills.technical || data.skills.list || []);
    skills.forEach((skill) => {
      const skillName = typeof skill === 'string' ? skill : skill.name;
      const skillId = generateId('skill');
      nodes.push({
        id: skillId,
        label: skillName,
        type: 'skill',
        title: `Beceri: ${skillName}`,
        level: typeof skill === 'object' ? skill.level : undefined
      });
      edges.push({ from: personId, to: skillId });
    });
  }
  
  // Projeler
  if (data.projects) {
    data.projects.forEach((project) => {
      const projectId = generateId('project');
      nodes.push({
        id: projectId,
        label: project.name || project.title,
        type: 'project',
        title: `Proje: ${project.name || project.title}`,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate
      });
      edges.push({ from: personId, to: projectId });
      
      // Proje becerileri
      if (project.skills || project.technologies) {
        const projectSkills = project.skills || project.technologies;
        projectSkills.forEach((skillName) => {
          // Mevcut beceri node'unu bul veya yeni oluştur
          let skillNode = nodes.find(n => n.type === 'skill' && n.label === skillName);
          if (!skillNode) {
            const skillId = generateId('skill');
            skillNode = {
              id: skillId,
              label: skillName,
              type: 'skill',
              title: `Beceri: ${skillName}`
            };
            nodes.push(skillNode);
            edges.push({ from: personId, to: skillId });
          }
          edges.push({ from: projectId, to: skillNode.id });
        });
      }
    });
  }
  
  // Sertifikalar
  if (data.certificates || data.certifications) {
    const certs = data.certificates || data.certifications;
    certs.forEach((cert) => {
      const certId = generateId('certificate');
      nodes.push({
        id: certId,
        label: cert.name || cert.title,
        type: 'certificate',
        title: `Sertifika: ${cert.name || cert.title}`,
        issuer: cert.issuer || cert.organization,
        startDate: cert.date || cert.issueDate,
        endDate: cert.date || cert.issueDate
      });
      edges.push({ from: personId, to: certId });
    });
  }
  
  // Diller
  if (data.languages) {
    data.languages.forEach((lang) => {
      const langName = typeof lang === 'string' ? lang : lang.name || lang.language;
      const langId = generateId('language');
      nodes.push({
        id: langId,
        label: langName,
        type: 'language',
        title: `Dil: ${langName}`,
        level: typeof lang === 'object' ? lang.level || lang.fluency : undefined
      });
      edges.push({ from: personId, to: langId });
    });
  }
  
  return { nodes, edges };
};

/**
 * 2. LinkedIn Tarzı Format Dönüştürücü
 * Format: { profile: {}, positions: [], educations: [], skills: [] }
 */
const convertLinkedInFormat = (data) => {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 0;
  
  const generateId = (prefix) => `${prefix}_${nodeIdCounter++}`;
  
  // Profil (Kişi)
  const personId = generateId('person');
  nodes.push({
    id: personId,
    label: `${data.profile.firstName} ${data.profile.lastName}`,
    type: 'person',
    title: `Kişi: ${data.profile.firstName} ${data.profile.lastName}`,
    headline: data.profile.headline,
    location: data.profile.location
  });
  
  // Pozisyonlar (LinkedIn'de direkt pozisyon var)
  if (data.positions) {
    data.positions.forEach((pos) => {
      const companyId = generateId('company');
      nodes.push({
        id: companyId,
        label: pos.companyName,
        type: 'company',
        title: `Şirket: ${pos.companyName}`,
        startDate: pos.startDate,
        endDate: pos.endDate || 'Devam Ediyor'
      });
      edges.push({ from: personId, to: companyId });
      
      const positionId = generateId('position');
      nodes.push({
        id: positionId,
        label: pos.title,
        type: 'position',
        title: `Pozisyon: ${pos.title}`,
        description: pos.description,
        startDate: pos.startDate,
        endDate: pos.endDate || 'Devam Ediyor'
      });
      edges.push({ from: companyId, to: positionId });
    });
  }
  
  // Eğitimler
  if (data.educations) {
    data.educations.forEach((edu) => {
      const eduId = generateId('education');
      nodes.push({
        id: eduId,
        label: edu.schoolName,
        type: 'education',
        title: `Eğitim: ${edu.schoolName} - ${edu.degree || ''}`,
        degree: edu.degree,
        field: edu.fieldOfStudy,
        startDate: edu.startDate,
        endDate: edu.endDate
      });
      edges.push({ from: personId, to: eduId });
    });
  }
  
  // Beceriler
  if (data.skills) {
    data.skills.forEach((skill) => {
      const skillId = generateId('skill');
      nodes.push({
        id: skillId,
        label: skill.name || skill,
        type: 'skill',
        title: `Beceri: ${skill.name || skill}`,
        endorsements: skill.endorsementCount
      });
      edges.push({ from: personId, to: skillId });
    });
  }
  
  return { nodes, edges };
};

/**
 * 3. Europass Formatı Dönüştürücü
 */
const convertEuropassFormat = (data) => {
  const learner = data.learnerInfo || data;
  return convertStandardCVFormat({
    personalInfo: {
      name: `${learner.firstName || ''} ${learner.lastName || ''}`.trim(),
      email: learner.email,
      phone: learner.phone,
      location: learner.address
    },
    experience: learner.workExperience || [],
    education: learner.education || [],
    skills: learner.skills || [],
    languages: learner.languages || []
  });
};

/**
 * 4. JSON Resume Formatı Dönüştürücü - KAPSAMLI VERSİYON
 * Format: https://jsonresume.org/schema/
 * TÜM alanları destekler: basics, work, volunteer, education, awards, 
 * certificates, publications, skills, languages, interests, references, projects
 */
const convertJSONResumeFormat = (data) => {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 0;
  
  const generateId = (prefix) => `${prefix}_${nodeIdCounter++}`;
  
  // ===== 1. BASICS (Kişi Bilgileri) =====
  const personId = generateId('person');
  const person = data.basics || {};
  
  nodes.push({
    id: personId,
    label: person.name || 'İsimsiz',
    type: 'person',
    title: `👤 ${person.name || 'İsimsiz'}${person.label ? ' - ' + person.label : ''}`,
    subtitle: person.label,
    email: person.email,
    phone: person.phone,
    url: person.url,
    summary: person.summary,
    location: person.location?.city,
    image: person.image
  });
  
  // Profiles (Social Media)
  if (person.profiles && person.profiles.length > 0) {
    person.profiles.forEach((profile) => {
      const profileId = generateId('profile');
      nodes.push({
        id: profileId,
        label: profile.network,
        type: 'social',
        title: `🌐 ${profile.network} (@${profile.username})`,
        username: profile.username,
        url: profile.url
      });
      edges.push({ from: personId, to: profileId });
    });
  }
  
  // ===== 2. WORK (İş Deneyimi) =====
  if (data.work && data.work.length > 0) {
    data.work.forEach((job) => {
      // Şirket node'u
      const companyId = generateId('company');
      nodes.push({
        id: companyId,
        label: job.name,
        type: 'company',
        title: `🏢 ${job.name}`,
        url: job.url,
        startDate: job.startDate,
        endDate: job.endDate || 'Devam Ediyor',
        summary: job.summary
      });
      edges.push({ from: personId, to: companyId });
      
      // Pozisyon node'u
      const positionId = generateId('position');
      nodes.push({
        id: positionId,
        label: job.position,
        type: 'position',
        title: `💼 ${job.position}`,
        startDate: job.startDate,
        endDate: job.endDate || 'Devam Ediyor',
        summary: job.summary
      });
      edges.push({ from: companyId, to: positionId });
      
      // Highlights (Başarılar)
      if (job.highlights && job.highlights.length > 0) {
        job.highlights.forEach((highlight, index) => {
          const highlightId = generateId('achievement');
          nodes.push({
            id: highlightId,
            label: `Başarı ${index + 1}`,
            type: 'achievement',
            title: `🎯 ${highlight.substring(0, 50)}${highlight.length > 50 ? '...' : ''}`,
            description: highlight
          });
          edges.push({ from: positionId, to: highlightId });
        });
      }
    });
  }
  
  // ===== 3. VOLUNTEER (Gönüllü Çalışma) =====
  if (data.volunteer && data.volunteer.length > 0) {
    data.volunteer.forEach((vol) => {
      const volunteerId = generateId('volunteer');
      nodes.push({
        id: volunteerId,
        label: vol.organization,
        type: 'volunteer',
        title: `❤️ ${vol.organization} - ${vol.position}`,
        position: vol.position,
        url: vol.url,
        startDate: vol.startDate,
        endDate: vol.endDate,
        summary: vol.summary
      });
      edges.push({ from: personId, to: volunteerId });
      
      // Volunteer Highlights
      if (vol.highlights && vol.highlights.length > 0) {
        vol.highlights.forEach((highlight) => {
          const highlightId = generateId('achievement');
          nodes.push({
            id: highlightId,
            label: 'Başarı',
            type: 'achievement',
            title: `🏆 ${highlight}`,
            description: highlight
          });
          edges.push({ from: volunteerId, to: highlightId });
        });
      }
    });
  }
  
  // ===== 4. EDUCATION (Eğitim) =====
  if (data.education && data.education.length > 0) {
    data.education.forEach((edu) => {
      const eduId = generateId('education');
      nodes.push({
        id: eduId,
        label: edu.institution,
        type: 'education',
        title: `🎓 ${edu.institution} - ${edu.studyType || ''} ${edu.area || ''}`,
        degree: edu.studyType,
        field: edu.area,
        url: edu.url,
        startDate: edu.startDate,
        endDate: edu.endDate,
        score: edu.score
      });
      edges.push({ from: personId, to: eduId });
      
      // Courses (Dersler)
      if (edu.courses && edu.courses.length > 0) {
        edu.courses.forEach((course) => {
          const courseId = generateId('course');
          nodes.push({
            id: courseId,
            label: course,
            type: 'course',
            title: `📚 ${course}`
          });
          edges.push({ from: eduId, to: courseId });
        });
      }
    });
  }
  
  // ===== 5. AWARDS (Ödüller) =====
  if (data.awards && data.awards.length > 0) {
    data.awards.forEach((award) => {
      const awardId = generateId('award');
      nodes.push({
        id: awardId,
        label: award.title,
        type: 'award',
        title: `🏆 ${award.title} - ${award.awarder}`,
        awarder: award.awarder,
        summary: award.summary,
        startDate: award.date,
        endDate: award.date
      });
      edges.push({ from: personId, to: awardId });
    });
  }
  
  // ===== 6. CERTIFICATES (Sertifikalar) =====
  if (data.certificates && data.certificates.length > 0) {
    data.certificates.forEach((cert) => {
      const certId = generateId('certificate');
      nodes.push({
        id: certId,
        label: cert.name,
        type: 'certificate',
        title: `📜 ${cert.name} (${cert.issuer})`,
        issuer: cert.issuer,
        url: cert.url,
        startDate: cert.date,
        endDate: cert.date
      });
      edges.push({ from: personId, to: certId });
    });
  }
  
  // ===== 7. PUBLICATIONS (Yayınlar) =====
  if (data.publications && data.publications.length > 0) {
    data.publications.forEach((pub) => {
      const pubId = generateId('publication');
      nodes.push({
        id: pubId,
        label: pub.name,
        type: 'publication',
        title: `📄 ${pub.name} - ${pub.publisher}`,
        publisher: pub.publisher,
        url: pub.url,
        summary: pub.summary,
        startDate: pub.releaseDate,
        endDate: pub.releaseDate
      });
      edges.push({ from: personId, to: pubId });
    });
  }
  
  // ===== 8. SKILLS (Beceriler) =====
  if (data.skills && data.skills.length > 0) {
    data.skills.forEach((skillGroup) => {
      // Eğer sadece keywords varsa, direkt skill olarak ekle
      if (skillGroup.keywords && skillGroup.keywords.length > 0) {
        skillGroup.keywords.forEach((keyword) => {
          // Mevcut skill node'unu kontrol et
          let skillNode = nodes.find(n => n.type === 'skill' && n.label === keyword);
          
          if (!skillNode) {
            const skillId = generateId('skill');
            skillNode = {
              id: skillId,
              label: keyword,
              type: 'skill',
              title: `⚡ ${keyword}${skillGroup.level ? ' (' + skillGroup.level + ')' : ''}`,
              level: skillGroup.level,
              category: skillGroup.name
            };
            nodes.push(skillNode);
            edges.push({ from: personId, to: skillId });
          }
        });
      }
    });
  }
  
  // ===== 9. LANGUAGES (Diller) =====
  if (data.languages && data.languages.length > 0) {
    data.languages.forEach((lang) => {
      const langId = generateId('language');
      nodes.push({
        id: langId,
        label: lang.language,
        type: 'language',
        title: `🌍 ${lang.language} (${lang.fluency || 'N/A'})`,
        level: lang.fluency
      });
      edges.push({ from: personId, to: langId });
    });
  }
  
  // ===== 10. INTERESTS (İlgi Alanları) =====
  if (data.interests && data.interests.length > 0) {
    data.interests.forEach((interest) => {
      const interestId = generateId('interest');
      nodes.push({
        id: interestId,
        label: interest.name,
        type: 'interest',
        title: `❤️ ${interest.name}`,
        keywords: interest.keywords?.join(', ')
      });
      edges.push({ from: personId, to: interestId });
      
      // Keywords (Alt ilgi alanları) - opsiyonel, çok fazla node olmaması için
      if (interest.keywords && interest.keywords.length > 0 && interest.keywords.length <= 3) {
        interest.keywords.forEach((keyword) => {
          const keywordId = generateId('interest_detail');
          nodes.push({
            id: keywordId,
            label: keyword,
            type: 'interest_detail',
            title: `🎨 ${keyword}`
          });
          edges.push({ from: interestId, to: keywordId });
        });
      }
    });
  }
  
  // ===== 11. REFERENCES (Referanslar) =====
  if (data.references && data.references.length > 0) {
    data.references.forEach((ref) => {
      // "Available upon request" gibi genel referansları atla
      if (ref.name && ref.name.toLowerCase() !== 'available upon request') {
        const refId = generateId('reference');
        nodes.push({
          id: refId,
          label: ref.name,
          type: 'reference',
          title: `👥 ${ref.name}`,
          reference: ref.reference
        });
        edges.push({ from: personId, to: refId });
      }
    });
  }
  
  // ===== 12. PROJECTS (Projeler) =====
  if (data.projects && data.projects.length > 0) {
    data.projects.forEach((project) => {
      const projectId = generateId('project');
      nodes.push({
        id: projectId,
        label: project.name,
        type: 'project',
        title: `🚀 ${project.name}`,
        description: project.description,
        url: project.url,
        startDate: project.startDate,
        endDate: project.endDate
      });
      edges.push({ from: personId, to: projectId });
      
      // Project Highlights
      if (project.highlights && project.highlights.length > 0) {
        project.highlights.forEach((highlight) => {
          const highlightId = generateId('achievement');
          nodes.push({
            id: highlightId,
            label: 'Başarı',
            type: 'achievement',
            title: `🎯 ${highlight}`,
            description: highlight
          });
          edges.push({ from: projectId, to: highlightId });
        });
      }
      
      // Project Keywords/Technologies
      if (project.keywords && project.keywords.length > 0) {
        project.keywords.forEach((keyword) => {
          // Mevcut skill'i bul veya oluştur
          let skillNode = nodes.find(n => n.type === 'skill' && n.label === keyword);
          
          if (!skillNode) {
            const skillId = generateId('skill');
            skillNode = {
              id: skillId,
              label: keyword,
              type: 'skill',
              title: `⚡ ${keyword}`
            };
            nodes.push(skillNode);
            edges.push({ from: personId, to: skillId });
          }
          
          edges.push({ from: projectId, to: skillNode.id });
        });
      }
    });
  }
  
  return { nodes, edges };
};

/**
 * 5. Hiyerarşik Format Dönüştürücü
 * Format: { person: { name: "", companies: [{ name: "", positions: [] }] } }
 */
const convertHierarchicalFormat = (data) => {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 0;
  
  const generateId = (prefix) => `${prefix}_${nodeIdCounter++}`;
  
  // Kişi
  const personId = generateId('person');
  nodes.push({
    id: personId,
    label: data.person.name,
    type: 'person',
    title: `Kişi: ${data.person.name}`
  });
  
  // Recursive olarak tüm nested yapıyı işle
  const processNestedItems = (items, parentId, itemType) => {
    if (!items) return;
    
    items.forEach((item) => {
      const itemId = generateId(itemType);
      nodes.push({
        id: itemId,
        label: item.name || item.title,
        type: itemType,
        title: `${itemType}: ${item.name || item.title}`,
        ...item
      });
      edges.push({ from: parentId, to: itemId });
      
      // Alt öğeleri işle
      if (item.positions) processNestedItems(item.positions, itemId, 'position');
      if (item.projects) processNestedItems(item.projects, itemId, 'project');
      if (item.skills) processNestedItems(item.skills, itemId, 'skill');
    });
  };
  
  if (data.person.companies) processNestedItems(data.person.companies, personId, 'company');
  if (data.person.education) processNestedItems(data.person.education, personId, 'education');
  if (data.person.skills) processNestedItems(data.person.skills, personId, 'skill');
  
  return { nodes, edges };
};

/**
 * Yardımcı fonksiyon: Format örneklerini döndür
 */
export const getFormatExamples = () => {
  return {
    STANDARD_CV: {
      personalInfo: { name: "Ahmet Yılmaz", email: "ahmet@example.com" },
      experience: [
        { company: "ABC Ltd", position: "Developer", startDate: "2020-01", endDate: "2022-06" }
      ],
      education: [
        { school: "İTÜ", degree: "Lisans", field: "Bilgisayar Müh." }
      ],
      skills: ["JavaScript", "React", "Node.js"]
    },
    LINKEDIN_STYLE: {
      profile: { firstName: "Ahmet", lastName: "Yılmaz", headline: "Software Engineer" },
      positions: [
        { title: "Developer", companyName: "ABC Ltd", startDate: "2020-01" }
      ],
      educations: [
        { schoolName: "İTÜ", degree: "Bachelor", fieldOfStudy: "CS" }
      ],
      skills: [{ name: "JavaScript", endorsementCount: 15 }]
    },
    JSON_RESUME: {
      basics: { name: "Ahmet Yılmaz", email: "ahmet@example.com" },
      work: [
        { name: "ABC Ltd", position: "Developer", startDate: "2020-01-01" }
      ],
      education: [
        { institution: "İTÜ", studyType: "Bachelor", area: "Computer Science" }
      ]
    }
  };
};

export default convertToGraphFormat;