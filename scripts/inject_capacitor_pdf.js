const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const lawsDownloadOriginal = `      doc.save('DriveLegal_Traffic_Laws.pdf');
      showToast('Traffic Laws PDF generated dynamically!', 'success');`;

const lawsDownloadNew = `      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const fileName = 'DriveLegal_Traffic_Laws.pdf';
      
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        if (Filesystem && Share) {
          Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: 'CACHE'
          }).then(result => {
            Share.share({
              title: fileName,
              url: result.uri,
              dialogTitle: 'Save or View PDF'
            });
            showToast('PDF ready to share/save!', 'success');
          }).catch(e => {
            console.error('File write error:', e);
            showToast('Failed to save PDF on device', 'error');
          });
        }
      } else {
        doc.save(fileName);
        showToast('Traffic Laws PDF generated dynamically!', 'success');
      }`;

const analyticsDownloadOriginal = `      doc.save('DriveLegal_Analytics_Report.pdf');
      showToast('Analytics PDF generated dynamically!', 'success');`;

const analyticsDownloadNew = `      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const fileName = 'DriveLegal_Analytics_Report.pdf';
      
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        if (Filesystem && Share) {
          Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: 'CACHE'
          }).then(result => {
            Share.share({
              title: fileName,
              url: result.uri,
              dialogTitle: 'Save or View PDF'
            });
            showToast('PDF ready to share/save!', 'success');
          }).catch(e => {
            console.error('File write error:', e);
            showToast('Failed to save PDF on device', 'error');
          });
        }
      } else {
        doc.save(fileName);
        showToast('Analytics PDF generated dynamically!', 'success');
      }`;

code = code.replace(lawsDownloadOriginal, lawsDownloadNew);
code = code.replace(analyticsDownloadOriginal, analyticsDownloadNew);

fs.writeFileSync('frontend/app.js', code);
console.log('Hybrid Capacitor download logic injected.');
