const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

code = code.replace(/â—/g, '•');
code = code.replace(/Â§/g, '§');
code = code.replace(/A\?\"A\? /g, '• ');

const listeners = `
document.addEventListener('DOMContentLoaded', () => {
  const btnDownloadLaws = document.getElementById('btn-download-laws');
  if (btnDownloadLaws) {
    btnDownloadLaws.addEventListener('click', () => {
      showToast('Traffic Laws Report downloaded successfully!', 'info');
    });
  }

  const btnViewMvAct = document.getElementById('btn-view-mvact');
  if (btnViewMvAct) {
    btnViewMvAct.addEventListener('click', () => {
      window.open('https://legislative.gov.in/actsofparliamentfromtheyear/motor-vehicles-act-1988/', '_blank');
    });
  }

  const btnDownloadAnalytics = document.getElementById('btn-download-analytics');
  if (btnDownloadAnalytics) {
    btnDownloadAnalytics.addEventListener('click', () => {
      showToast('Road Safety Analytics Report downloaded successfully!', 'info');
    });
  }

  const chatItems = document.querySelectorAll('.ai-chat-item');
  chatItems.forEach(item => {
    item.addEventListener('click', () => {
      chatItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const chatTitle = item.querySelector('div > div').textContent;
      const chatMsgs = document.getElementById('chat-messages');
      if (chatMsgs) {
        chatMsgs.innerHTML = '';
        appendMsg(chatTitle, false);
        appendMsg('I have loaded our previous conversation regarding: ' + chatTitle + '. How else can I help you?', true);
      }
      showToast('Loaded previous chat session', 'info');
    });
  });
});
`;

code += listeners;
fs.writeFileSync('frontend/app.js', code);
