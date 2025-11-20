// This is the URL for your Vercel backend
const API_ENDPOINT = 'https://vercel-origin-engine.vercel.app/api/check_domain';
const WORKER_ENDPOINT = 'https://my-worker.workers.dev';

const ui = {
  urlText: document.getElementById('url'),
  domainText: document.getElementById('domain'),
  domainAgeText: document.getElementById('domain-age'),
  riskBadge: document.getElementById('risk-score'),
  riskLabel: document.getElementById('risk-label'),
  spinner: document.getElementById('spinner'),
  statusText: document.getElementById('status'),
  checkArchives: document.getElementById('check-archives'),
  switchButton: document.getElementById('switch-substack'),
  status: document.getElementById('status'),
};

let currentUrl = '';
let pulseIntervalId = null;

const getActiveTabUrl = () =>
  new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        const tab = tabs && tabs[0];
        resolve(tab?.url || '');
      });
    } catch (error) {
      reject(error);
    }
  });

const setSpinnerVisible = (isVisible) => {
  if (!ui.spinner) return;
  ui.spinner.style.display = isVisible ? 'flex' : 'none';
const setStatus = (message) => {
  if (ui.status) {
    ui.status.textContent = message;
  }
};

const setStatus = (text) => {
  if (ui.statusText) ui.statusText.textContent = text;
const startLoadingAnimation = () => {
  if (!ui.status || pulseIntervalId) return;
  let faded = false;
  pulseIntervalId = setInterval(() => {
    faded = !faded;
    ui.status.style.opacity = faded ? '0.6' : '1';
  }, 500);
};

const setRisk = (data) => {
  if (!ui.riskBadge || !ui.riskLabel) return;

  // --- SAFEGUARD START ---
  // If data is missing (because of a server error), handle it gracefully
  if (!data) {
    ui.riskBadge.textContent = 'ERROR';
    ui.riskBadge.style.backgroundColor = '#888';
    ui.riskLabel.textContent = 'Connection Failed';
    if (ui.domainAgeText) ui.domainAgeText.textContent = 'Check internet/server';
    return; 
const stopLoadingAnimation = () => {
  if (pulseIntervalId) {
    clearInterval(pulseIntervalId);
    pulseIntervalId = null;
  }
  // --- SAFEGUARD END ---

  let label = 'UNKNOWN';
  let color = '#888';
  let summary = 'Analysis failed';

  const level = data.risk_level ? data.risk_level.toUpperCase() : 'UNKNOWN';
  
  if (level === 'HIGH' || level === 'CRITICAL') {
      label = 'HIGH RISK';
      color = '#e64b3c'; 
  } else if (level === 'MEDIUM') {
      label = 'CAUTION';
      color = '#f3c623'; 
  } else if (level === 'LOW') {
      label = 'SAFE';
      color = '#3cb878'; 
  if (ui.status) {
    ui.status.style.opacity = '1';
  }
};

  ui.riskBadge.textContent = label;
  ui.riskBadge.style.backgroundColor = color;
  ui.riskLabel.textContent = data.summary || "No summary provided";
  
  if (ui.domainAgeText) {
      const flags = data.red_flags && Array.isArray(data.red_flags) 
          ? data.red_flags.join(", ") 
          : "No flags detected";
      ui.domainAgeText.textContent = flags;
  }
const getActiveTab = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tabs && tabs[0]);
    });
  });

const extractPageText = async (tabId) => {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.body?.innerText || '',
  });
  return (result?.result || '').trim();
};

const populateData = (data) => {
  if (ui.urlText) ui.urlText.textContent = currentUrl;
  try {
      const hostname = new URL(currentUrl).hostname;
      if (ui.domainText) ui.domainText.textContent = hostname;
  } catch (e) {
      if (ui.domainText) ui.domainText.textContent = "Unknown Domain";
const sendToWorker = async (text) => {
  const response = await fetch(WORKER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Worker error: ${response.status}`);
  }
  setRisk(data);

  return response.json();
};

const fetchDomainData = async () => {
  setSpinnerVisible(true);
  setStatus('AI Agent is analyzing...');
const handleSwitchToSubstack = async () => {
  setStatus('Searching...');
  startLoadingAnimation();

  try {
    currentUrl = await getActiveTabUrl();
    if (ui.urlText) ui.urlText.textContent = currentUrl || 'Unknown URL';

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl }),
    });
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    const pageText = await extractPageText(tab.id);
    if (!pageText) {
      throw new Error('Could not read text from this page');
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const data = await sendToWorker(pageText);
    const destination = data?.url;

    populateData(data);
    setStatus('Analysis Complete');
    if (destination) {
      setStatus('Switching you to Substack...');
      await chrome.tabs.update(tab.id, { url: destination });
    } else {
      setStatus("We couldn't find a Substack version for this page.");
    }
  } catch (error) {
    console.error('Error:', error);
    setStatus('Error: ' + error.message);
    setRisk(null); // Pass null so the safeguard runs
    console.error('Switch to Substack error:', error);
    setStatus('Something went wrong. Please try again.');
  } finally {
    setSpinnerVisible(false);
    stopLoadingAnimation();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  if (ui.checkArchives) {
      ui.checkArchives.addEventListener('click', () => {
        if (!currentUrl) return;
        const archiveUrl = `https://archive.today/newest/${encodeURIComponent(currentUrl)}`;
        chrome.tabs.create({ url: archiveUrl });
      });
  if (ui.switchButton) {
    ui.switchButton.addEventListener('click', handleSwitchToSubstack);
  }
  fetchDomainData();
});
