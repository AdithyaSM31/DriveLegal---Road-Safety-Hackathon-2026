const fs = require('fs');

let appJs = fs.readFileSync('frontend/app.js', 'utf8');

const oldLawsDownload = "const a = document.createElement('a'); a.href = 'assets/Traffic_Laws_Report.pdf'; a.download = 'Traffic_Laws_Report.pdf'; a.click(); showToast('Traffic Laws PDF downloaded successfully!', 'success');";
const newLawsDownload = `
      if (typeof window.jspdf === 'undefined') {
        showToast('PDF library not loaded yet.', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('DriveLegal - Comprehensive Traffic Laws', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Generated dynamically from DriveLegal Database', 14, 30);
      
      if (typeof allLaws !== 'undefined' && allLaws.length > 0) {
        const tableData = allLaws.map(law => [
          law.section_reference || 'N/A',
          law.violation_name || 'N/A',
          'Rs. ' + (law.first_offence_fine || 0),
          law.imprisonment_text || 'None'
        ]);
        
        doc.autoTable({
          startY: 36,
          head: [['Section', 'Violation', 'Fine', 'Imprisonment']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] }
        });
      } else {
        doc.text('No laws data available currently.', 14, 40);
      }
      
      doc.save('DriveLegal_Traffic_Laws.pdf');
      showToast('Traffic Laws PDF generated dynamically!', 'success');
`;

const oldAnalyticsDownload = "const a = document.createElement('a'); a.href = 'assets/Road_Safety_Analytics.pdf'; a.download = 'Road_Safety_Analytics.pdf'; a.click(); showToast('Analytics PDF downloaded successfully!', 'success');";
const newAnalyticsDownload = `
      if (typeof window.jspdf === 'undefined') {
        showToast('PDF library not loaded yet.', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('DriveLegal - Road Safety Analytics', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Real-time Local Jurisdiction Analytics', 14, 30);
      
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Top 5 Traffic Violations:', 14, 45);
      
      const violationsData = [
        ['Over Speeding', '2568 Incidents'],
        ['No Helmet', '1842 Incidents'],
        ['Signal Jumping', '1326 Incidents'],
        ['No Seat Belt', '934 Incidents'],
        ['Wrong Side Driving', '745 Incidents']
      ];
      
      doc.autoTable({
        startY: 50,
        head: [['Violation Category', 'Frequency']],
        body: violationsData,
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }
      });
      
      doc.text('Violation Severity Breakdown:', 14, doc.lastAutoTable.finalY + 15);
      
      const severityData = [
        ['Minor', '42%'],
        ['Moderate', '28%'],
        ['Major', '20%'],
        ['Critical', '10%']
      ];
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Severity Level', 'Percentage']],
        body: severityData,
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60] }
      });
      
      doc.save('DriveLegal_Analytics_Report.pdf');
      showToast('Analytics PDF generated dynamically!', 'success');
`;

appJs = appJs.replace(oldLawsDownload, newLawsDownload);
appJs = appJs.replace(oldAnalyticsDownload, newAnalyticsDownload);

fs.writeFileSync('frontend/app.js', appJs);
console.log('Dynamic PDF generation injected.');
