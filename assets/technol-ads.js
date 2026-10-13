// Preview-only branch: original brand artwork, no ad network or tracking.
export function technolAds(){
 const panel=(side)=>`<aside class="technol-ad technol-${side}" aria-label="Technol reklamı"><a href="https://technol.az/" target="_blank" rel="noopener noreferrer sponsored"><span class="technol-label">REKLAM</span><img class="technol-logo" src="assets/technol-logo.svg" alt="Technol" width="1020" height="243"><div class="technol-copy"><span>MÜHƏRRİK YAĞLARI</span><strong>Hər yolun<br>öz seçimi.</strong></div><div class="technol-art"><img src="assets/technol-oil.svg" alt="Technol Platinum ECO mühərrik yağı" width="400" height="500"></div><span class="technol-cta">Məhsullara bax <span aria-hidden="true">↗</span></span><span class="technol-domain">technol.az</span></a></aside>`;
 return panel('left')+panel('right');
}
