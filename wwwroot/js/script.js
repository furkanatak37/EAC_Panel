﻿//import { compressIcon, expandIcon } from './icons.js'; 


const personelInfoIcerik = document.getElementById('personel-info-icerik');
const personelListesi = document.getElementById('personelListesi');

const adFiltreInput = document.getElementById('adFiltre');
const departmanFiltreSelect = document.getElementById('departmanFiltre');
const gununEnleriIcerik = document.getElementById('gunun-enleri-icerik');
const izinlilerListesi = document.getElementById('izinliler-listesi');

const gecGelenlerListesi = document.getElementById('gec-gelenler-listesi');
const erkenCikanlarListesi = document.getElementById('erken-cikanlar-listesi');
const gelmeyenlerListesi = document.getElementById('gelmeyenler-listesi');
const raporPaneli = document.querySelector('.rapor-paneli'); // DÜZELTME: Doğru konteyner seçildi

const departmanAnalizIcerik = document.getElementById('departman-analiz-icerik');
const fazlaMesaiListesi = document.getElementById('fazla-mesai-listesi');
const baslangicTarihInput = document.getElementById('baslangicTarih');
const bitisTarihInput = document.getElementById('bitisTarih');
 const compressIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash-lg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8z"/></svg>`;

const expandIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>`;


//rapor kartlarının boyut butonları
const toggleSizeBtn = document.getElementById('toggle-size-btn');
const toggleSizeIcon = document.getElementById('toggle-size-icon');
const toggleSizeLabel = document.getElementById('toggle-size-label');
const raporKartlariContainer = document.querySelector('.rapor-kartlari');


//event listener lar
document.addEventListener('DOMContentLoaded', initializePage);
adFiltreInput.addEventListener('input', applyFilters);
departmanFiltreSelect.addEventListener('change', applyFilters);


//buton tanımlamaları
const gecGelenlerDetayBtn = document.getElementById('gec-gelenler-detay-btn');

const gelmeyenlerDetayBtn = document.getElementById('gelmeyenler-detay-btn');


// script.js en üstü
let currentAralikPersonelOzetleri = []; // Seçili aralıktaki personel özetini tutmak için
const fazlaMesaiDetayBtn = document.getElementById('fazla-mesai-detay-btn');
const raporOlusturBtn = document.getElementById('raporOlusturBtn');
const departmanDetayBtn = document.getElementById('departman-detay-btn');
const erkenCikanlarDetayBtn = document.getElementById('erken-cikanlar-detay-btn');

const modalBody = document.getElementById('modal-body-content');

const kisiDetayBaslik = document.getElementById('kisiDetayBaslik');
const barChartContainer = document.getElementById('barChartContainer');
const donutChartContainer = document.getElementById('donutChartContainer');
const gunlukDetayKutusu = document.getElementById('gunlukDetay');
const gunSeciciSelect = document.getElementById('gunSecici');


Chart.register(ChartDataLabels); 

let currentPersonApiData = [];
let mesaiChart = null;
let durumChart = null;
let allPersonnel = [];


const CHART_COLORS = {
    normal: 'rgba(75, 192, 192, 0.6)',
    eksik: 'rgba(255, 99, 132, 0.6)',
    fazla: 'rgba(54, 162, 235, 0.6)',
    normal_border: 'rgba(75, 192, 192, 1)',
    eksik_border: 'rgba(255, 99, 132, 1)',
};

function populateGunSecici(tarihler) {
    gunSeciciSelect.innerHTML = '<option value="">Tarih Seçin...</option>';
    tarihler.forEach((tarih, index) => {
        const option = document.createElement('option');
        option.value = index; 
        option.textContent = tarih;
        gunSeciciSelect.appendChild(option);

    });
}



function handleGunSeciciChange() {
    const selectedIndex = parseInt(gunSeciciSelect.value);

    if (isNaN(selectedIndex)) { 
        mesaiChart.setActiveElements([]); 
        mesaiChart.update();
        return;
    }

   
    displayDailyDetails(currentPersonApiData[selectedIndex]);

    mesaiChart.setActiveElements([{ datasetIndex: 0, index: selectedIndex }]);
    mesaiChart.update();
}


function renderFazlaMesai(personelData) {

    const mesaiYapanlar = personelData.filter(p => (p.FazlaMesaiDakika || p.fazlaMesaiDakika) > 0);

    fazlaMesaiListesi.innerHTML = '';
    if (mesaiYapanlar.length === 0) {
        fazlaMesaiListesi.innerHTML = '<li>Fazla mesai yapan personel yok.</li>';
        return;
    }

    mesaiYapanlar.sort((a, b) => (b.FazlaMesaiDakika || b.fazlaMesaiDakika) - (a.FazlaMesaiDakika || a.fazlaMesaiDakika));

    mesaiYapanlar.forEach(p => {
        const li = document.createElement('li');
        const mesaiDakika = p.FazlaMesaiDakika || p.fazlaMesaiDakika;
        const saat = Math.floor(mesaiDakika / 60);
        const dakika = mesaiDakika % 60;

        let mesaiSuresi = '';
        if (saat > 0) mesaiSuresi += `${saat} saat `;
        if (dakika > 0) mesaiSuresi += `${dakika} dakika`;

        li.textContent = `${p.Ad || p.ad} ${p.Soyad || p.soyad} (+${mesaiSuresi.trim()})`;
        fazlaMesaiListesi.appendChild(li);
    });
}

function populateGunSecici(tarihler) {
    gunSeciciSelect.innerHTML = '<option value="">Tarih Seçin...</option>'; 
    tarihler.forEach((tarih, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = tarih;
        gunSeciciSelect.appendChild(option);
    });
}


function handleGunSeciciChange() {
    const selectedIndex = parseInt(gunSeciciSelect.value);

    if (isNaN(selectedIndex)) { 
        mesaiChart.setActiveElements([]); 
        mesaiChart.update();
        return;
    }

   
    displayDailyDetails(currentPersonApiData[selectedIndex]);

  
    mesaiChart.setActiveElements([{ datasetIndex: 0, index: selectedIndex }]);
    mesaiChart.update();
}

function initializePage() {
  
    const today = new Date();
    const ayinIlkGunu = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const ayinSonGunu = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    baslangicTarihInput.value = ayinIlkGunu;
    bitisTarihInput.value = ayinSonGunu;

    setInitialReportState();
    personelleriGetir();
    guncelleAralikRaporlari(); 
}


function setInitialReportState() {
    const initialMessage = 'Raporu görüntülemek için lütfen bir tarih seçin.';
    gecGelenlerListesi.innerHTML = `<li>${initialMessage}</li>`;
    erkenCikanlarListesi.innerHTML = `<li>${initialMessage}</li>`;
    gelmeyenlerListesi.innerHTML = `<li>${initialMessage}</li>`;

    izinlilerListesi.innerHTML = `<p>${initialMessage}</p>`;

    gununEnleriIcerik.innerHTML = `<p>${initialMessage}</p>`;
    departmanAnalizIcerik.innerHTML = `<p>${initialMessage}</p>`;
}

function personelleriGetir() {
    fetch('/api/data/personeller')
        .then(response => {
            if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
            return response.json();
        })
        .then(data => {
            allPersonnel = data;
            populateDepartmentFilter();
            renderPersonnelList(allPersonnel);
        })
        .catch(error => {
            console.error('Personel listesi alınırken hata:', error);
            personelListesi.innerHTML = `<li>HATA: Liste yüklenemedi.</li>`;
        });
}


async function guncelleAralikRaporlari() {

    raporPaneli.classList.remove('panel-compact');
     toggleSizeIcon.innerHTML = compressIcon;
     toggleSizeLabel.textContent = "Görünümü Küçült";

    const baslangic = baslangicTarihInput.value;
    const bitis = bitisTarihInput.value;
    if (!baslangic || !bitis || new Date(baslangic) > new Date(bitis)) {
        alert("Lütfen geçerli bir başlangıç ve bitiş tarihi seçin.");
        return;
    }
    gecGelenlerDetayBtn.href = `rapor.html?rapor=gec&baslangic=${baslangic}&bitis=${bitis}`;
    fazlaMesaiDetayBtn.href = `rapor.html?rapor=mesai&baslangic=${baslangic}&bitis=${bitis}`;
    departmanDetayBtn.href = `rapor.html?rapor=departman&baslangic=${baslangic}&bitis=${bitis}`;
    erkenCikanlarDetayBtn.href = `rapor.html?rapor=erken&baslangic=${baslangic}&bitis=${bitis}`;
    gelmeyenlerDetayBtn.href = `rapor.html?rapor=gelmeyenler&baslangic=${baslangic}&bitis=${bitis}`


    gecGelenlerListesi.innerHTML = '<li>Yükleniyor...</li>';

    gelmeyenlerListesi.innerHTML = '<li>Yükleniyor...</li>';

    erkenCikanlarListesi.innerHTML = '<li>Yükleniyor...</li>';
    fazlaMesaiListesi.innerHTML = '<li>Yükleniyor...</li>';
    gununEnleriIcerik.innerHTML = '<p>Yükleniyor...</p>';
    izinlilerListesi.innerHTML = '<p>Yükleniyor...</p>';

    departmanAnalizIcerik.innerHTML = '<p>Yükleniyor...</p>';

    try {
        const response = await fetch(`/api/data/aralik-raporu?baslangic=${baslangic}&bitis=${bitis}`);
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
        const data = await response.json();

        currentAralikPersonelOzetleri = data.personelOzetleri || [];

        renderGecKalanlarAralik(data.personelOzetleri || []);
        renderErkenCikanlarAralik(data.personelOzetleri || []);
        renderFazlaMesaiAralik(data.personelOzetleri || []);
        renderAraliginEnleri(data.araliginEnleri);
        renderDepartmanAnaliziAralik(data.departmanOzetleri || []);


        const response2 = await fetch(`/api/data/getGelmeyenler?baslangic=${baslangic}&bitis=${bitis}`);
        if (!response2.ok) throw new Error(`API Hatası: ${response2.status}`);
        const data2 = await response2.json();


        renderGelmeyenler(data2 || [])


        const response3 = await fetch(`/api/data/getIzinliler?baslangic=${baslangic}&bitis=${bitis}`);
        if (!response3.ok) throw new Error(`API Hatası: ${response3.status}`);
        const data3 = await response3.json();


        renderIzinliler(data3 || [])


    } catch (error) {
        console.error("Aralık raporu alınırken hata:", error);
        const errorMessage = '<li>Rapor alınamadı.</li>';
        gecGelenlerListesi.innerHTML = errorMessage;
        erkenCikanlarListesi.innerHTML = errorMessage;
        gelmeyenlerListesi.innerHTML = errorMessage;

        fazlaMesaiListesi.innerHTML = errorMessage;
        gununEnleriIcerik.innerHTML = '<p>Hata!</p>';
        izinlilerListesi.innerHTML = '<p>Hata!</p>';

        departmanAnalizIcerik.innerHTML = '<p>Hata!</p>';
    }



}

// script.js dosyanızdaki bu fonksiyonu güncelleyin
function renderGecKalanlarAralik(personelOzetleri) {
    const gecKalanlar = personelOzetleri.filter(p => (p.gecKalmaSayisi || p.GecKalmaSayisi) > 0);
    gecGelenlerListesi.innerHTML = '';
    if (gecGelenlerListesi.length === 0) {
        gecGelenlerListesi.innerHTML = '<li>Bu aralıkta geç kalan personel bulunamadı.</li>';
        return;
    }
    gecKalanlar.sort((a, b) => (b.gecKalmaSayisi || b.GecKalmaSayisi) - (a.gecKalmaSayisi || a.GecKalmaSayisi));

    gecKalanlar.forEach(p => {
        const li = document.createElement('li');
        // YENİ: Butonun tıklama olayında kullanılacak verileri data-* attribute'larına ekliyoruz.
        li.innerHTML = `  
    <div class="gecikme-detay">
        <div class="gecikme-sol">
            <span class="devamsiz-isim">${p.Ad || p.ad} ${p.Soyad || p.soyad}</span>
            <span class="devamsiz-gun-sayisi"> (${p.gecKalmaSayisi || p.GecKalmaSayisi} kez)</span>
        </div>
        <button class="goster-btn" 
                data-userid="${p.UserID || p.userID}" 
                data-adsoyad="${p.Ad || p.ad} ${p.Soyad || p.soyad}">
            Göster
        </button>
    </div>
`;

        gecGelenlerListesi.appendChild(li);
    });
}


// script.js en altı

// Gerekli modal elementlerini tanımla
const detayModal = document.getElementById('detay-modal');
const modalBodydetay = document.getElementById('detay-modal-body');

// Olay delegasyonu ile "Geç Gelenler" listesindeki tıklamaları dinle
gecGelenlerListesi.addEventListener('click', (event) => {
    const gosterButonu = event.target.closest('.goster-btn');
    if (gosterButonu) {
        const userId = gosterButonu.dataset.userid;
        const adSoyad = gosterButonu.dataset.adsoyad;
        const baslangic = document.getElementById('baslangicTarih').value;
        const bitis = document.getElementById('bitisTarih').value;

        showGecKalmaDetayModal(userId, adSoyad, baslangic, bitis);
    }
});

/**
 * Belirtilen kişi için geç kaldığı günleri modal'da gösterir.
 */
async function showGecKalmaDetayModal(userId, adSoyad, baslangic, bitis) {
    // Modal'ı aç ve yükleniyor mesajı göster
    modalBodydetay.innerHTML = `<h4>${adSoyad} - Geç Kaldığı Günler</h4><p>Yükleniyor...</p>`;
    openModal(detayModal);

    try {
        const response = await fetch(`/api/data/gec-kalma-detaylari?userId=${userId}&baslangic=${baslangic}&bitis=${bitis}`);
        if (!response.ok) throw new Error("Detaylar alınamadı.");
        const detaylar = await response.json();

        if (detaylar.length === 0) {
            modalBodydetay.innerHTML = `<h4>${adSoyad} - Geç Kaldığı Günler</h4><p>Listelenecek tarih bulunamadı.</p>`;
            return;
        }

        // Gelen tarihleri liste olarak formatla
        let listeHtml = `<ul class="detay-modal-liste">`;
        detaylar.forEach(detay => {
            const tarih = new Date(detay.tarih).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const girisSaati = new Date(detay.ilkGiris).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            listeHtml += `<li><strong>${tarih}:</strong> ${girisSaati}</li>`;
        });
        listeHtml += `</ul>`;

        modalBodydetay.innerHTML = `<h4>${adSoyad} - Geç Kaldığı Günler</h4>${listeHtml}`;

    } catch (error) {
        console.error("Geç kalma detayları alınırken hata:", error);
        modalBodydetay.innerHTML = `<h4>${adSoyad} - Geç Kaldığı Günler</h4><p style="color:red;">Detaylar yüklenirken bir hata oluştu.</p>`;
    }
}

/**
 * Gelen özet verisine göre "Devamsızlar" kartını doldurur.
 */


// script.js dosyanızdaki bu fonksiyonu güncelleyin
// Fonksiyon adını diğerleriyle tutarlı olması için 'renderDevamsizlarAralik' yapmanızı öneririm.

function renderGelmeyenler(devamsizlar) {
    gelmeyenlerListesi.innerHTML = '';
    if (!devamsizlar || devamsizlar.length === 0) {
        gelmeyenlerListesi.innerHTML = '<li>Bu aralıkta devamsızlık yapan personel bulunamadı.</li>';
        return;
    }
    devamsizlar.sort((a, b) => (b.devamsizlikGunSayisi || b.DevamsizlikGunSayisi) - (a.devamsizlikGunSayisi || a.DevamsizlikGunSayisi));

    devamsizlar.forEach(p => {
        const li = document.createElement('li');
        const adSoyad = `${p.Ad || p.ad} ${p.Soyad || p.soyad}`;
        const gunSayisi = p.devamsizlikGunSayisi || p.DevamsizlikGunSayisi;

        // "Geç Gelenler" ile aynı HTML yapısını ve sınıfları kullanıyoruz
        li.innerHTML = `
           <div class="gecikme-detay">
              <div class="gecikme-detay-sol">
            <span class="devamsiz-isim">${adSoyad}</span>
         
                <span class="devamsiz-gun-sayisi">(${gunSayisi} gün)</span>
                </div>
                <button class="goster-btn" 
                        data-userid="${p.UserID || p.userID}" 
                        data-adsoyad="${adSoyad}">
                    Göster
                </button>
            </div>
        `;
        gelmeyenlerListesi.appendChild(li);
    });
}

// script.js dosyanızdaki bu fonksiyonu güncelleyin
function renderErkenCikanlarAralik(personelOzetleri) {
    const erkenCikanlar = personelOzetleri.filter(p => (p.erkenCikmaSayisi || p.ErkenCikmaSayisi) > 0);
    erkenCikanlarListesi.innerHTML = '';
    if (erkenCikanlar.length === 0) {
        erkenCikanlarListesi.innerHTML = '<li>Bu aralıkta erken çıkan personel bulunamadı.</li>';
        return;
    }
    erkenCikanlar.sort((a, b) => (b.erkenCikmaSayisi || b.ErkenCikmaSayisi) - (a.erkenCikmaSayisi || a.ErkenCikmaSayisi));

    erkenCikanlar.forEach(p => {
        const li = document.createElement('li');
        // "Geç Gelenler" ile aynı HTML yapısını ve sınıfları kullanıyoruz
        li.innerHTML = `
        <div class="gecikme-detay">
         <div class="gecikme-sol">
            <span class="devamsiz-isim">${p.Ad || p.ad} ${p.Soyad || p.soyad}</span>
       
                <span class="devamsiz-gun-sayisi"> (${p.erkenCikmaSayisi || p.ErkenCikmaSayisi} kez )</span>
                     </div>
                <button class="goster-btn" 
                        data-userid="${p.UserID || p.userID}" 
                        data-adsoyad="${p.Ad || p.ad} ${p.Soyad || p.soyad}">
                    Göster
                </button>
            </div>
        `;
        erkenCikanlarListesi.appendChild(li);
    });
}

// script.js dosyanızdaki bu fonksiyonu güncelleyin
function renderFazlaMesaiAralik(personelOzetleri) {
    const mesaiYapanlar = personelOzetleri.filter(p => (p.toplamFazlaMesaiDakika || p.ToplamFazlaMesaiDakika) > 0);
    fazlaMesaiListesi.innerHTML = '';
    if (mesaiYapanlar.length === 0) {
        fazlaMesaiListesi.innerHTML = '<li>Bu aralıkta fazla mesai yapan personel bulunamadı.</li>';
        return;
    }
    mesaiYapanlar.sort((a, b) => (b.toplamFazlaMesaiDakika || b.ToplamFazlaMesaiDakika) - (a.toplamFazlaMesaiDakika || a.ToplamFazlaMesaiDakika));

    mesaiYapanlar.forEach(p => {
        const li = document.createElement('li');
        const mesaiDakika = p.toplamFazlaMesaiDakika || p.ToplamFazlaMesaiDakika;
        const saat = Math.floor(mesaiDakika / 60);
        const dakika = mesaiDakika % 60;
        let mesaiSuresi = '';
        if (saat > 0) mesaiSuresi += `${saat} saat `;
        if (dakika > 0) mesaiSuresi += `${dakika} dakika`;

        li.innerHTML = `
        <div class="gecikme-detay">
        <div class="gecikme-detay-sol">
            <span class="devamsiz-isim">${p.Ad || p.ad} ${p.Soyad || p.soyad}</span>
            
                <span class="devamsiz-gun-sayisi">(${"+" + mesaiSuresi.trim()})</span>
                </div>
                <button class="goster-btn" 
                        data-userid="${p.UserID || p.userID}" 
                        data-adsoyad="${p.Ad || p.ad} ${p.Soyad || p.soyad}">
                    Göster
                </button>
            </div>
        `;
        fazlaMesaiListesi.appendChild(li);
    });
}

function renderAraliginEnleri(enlerData) {
    gununEnleriIcerik.innerHTML = '';

    if (!enlerData || enlerData.length === 0) {
        gununEnleriIcerik.innerHTML = '<p>Bu aralık için özet bilgi bulunamadı.</p>';
        return;
    }

  
    const fragment = document.createDocumentFragment();
    enlerData.forEach(gununEni => {
        const gunDiv = document.createElement('li');
        gunDiv.className = 'gunun-eni-item'; 

        const tarih = new Date(gununEni.tarih).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' });
        const erkenSaat = new Date(gununEni.enErkenGelisSaati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const gecSaat = new Date(gununEni.enGecCikisSaati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        gunDiv.innerHTML = `<p class="gunun-eni-tarih"><strong>${tarih}</strong></p>
            <p><strong>Erken Gelen:</strong> ${gununEni.enErkenGelenIsim} (${erkenSaat})</p>
            <p><strong>Geç Çıkan:</strong> ${gununEni.enGecCikanIsim} (${gecSaat})</p>`;
        fragment.appendChild(gunDiv);
    });

    gununEnleriIcerik.appendChild(fragment);
}



/**
 * Gelen veriye göre "İzinli Personel" kartını doldurur.
 * @param {Array} izinlilerData - API'den gelen izinli personel listesi.
 */
function renderIzinliler(izinlilerData) {
    izinlilerListesi.innerHTML = ''; // Önceki listeyi temizle

    if (!izinlilerData || izinlilerData.length === 0) {
        // Liste boşsa bilgilendirme mesajı göster
        izinlilerListesi.innerHTML = '<p class="kart-placeholder">Bu aralıkta izinli personel bulunamadı.</p>';
        return;
    }

    // Performans için bir fragment oluşturalım
    const fragment = document.createDocumentFragment();

    izinlilerData.forEach(izin => {
        // Her bir izin kaydı için bir div oluştur
        const itemDiv = document.createElement('div');
        itemDiv.className = 'izinli-kisi-item';

        const adSoyad = `${izin.ad || izin.Ad} ${izin.soyad || izin.Soyad}`;
        const departman = izin.departman || izin.Departman || 'N/A';

        // Tarihleri formatla (örn: 05 Ağu - 10 Ağu 2025)
        const baslangicTarihi = new Date(izin.izinBaslangic || izin.IzinBaslangic).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short'
        });
        const bitisTarihi = new Date(izin.izinBitis || izin.IzinBitis).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        // Div'in iç HTML'ini oluştur
        itemDiv.innerHTML = `
            <div class="izinli-personel-bilgi">
                <span class="izinli-isim">${adSoyad}</span>
                <span class="izinli-departman">${departman}</span>
            </div>
            <div class="izinli-tarih-araligi">
                ${baslangicTarihi} - ${bitisTarihi}
            </div>
        `;

        fragment.appendChild(itemDiv);
    });

    // Oluşturulan tüm elemanları tek seferde DOM'a ekle
    izinlilerListesi.appendChild(fragment);
}



// script.js dosyanızdaki bu fonksiyonu güncelleyin
function renderDepartmanAnaliziAralik(departmanOzetleri) {
    departmanAnalizIcerik.innerHTML = '';
    if (!departmanOzetleri || departmanOzetleri.length === 0) {
        departmanAnalizIcerik.innerHTML = '<p>Analiz edilecek departman verisi yok.</p>';
        return;
    }

    departmanOzetleri.forEach(dep => {
        // 'p' yerine 'div' kullanarak daha iyi yapılandıralım
        const itemDiv = document.createElement('li');
        itemDiv.className = 'departman-analiz-item';

        const ortGiris = dep.ortalamaGiris.substring(0, 5);
        const ortCikis = dep.ortalamaCikis.substring(0, 5);

        itemDiv.innerHTML = `
            <div class="departman-analiz-bilgi">
                <strong>${dep.departman}</strong>
               <strong class="departman-kisi"> (${dep.kisiSayisi} kişi):</strong>
               <small>Ort. Giriş: ${ortGiris} | Ort. Çıkış: ${ortCikis}</small>
            </div>
            <button class="goster-btn" data-departman="${dep.departman}">Göster</button>
        `;
        departmanAnalizIcerik.appendChild(itemDiv);
    });
}

function applyFilters() {
    const nameFilter = adFiltreInput.value.toLowerCase();
    const depFilter = departmanFiltreSelect.value;
    let filteredList = allPersonnel;
    if (nameFilter) {
        filteredList = filteredList.filter(p => `${p.ad || p.Ad} ${p.soyad || p.Soyad}`.toLowerCase().includes(nameFilter));
    }
    if (depFilter) {
        filteredList = filteredList.filter(p => (p.departman || p.Departman) === depFilter);
    }
    renderPersonnelList(filteredList);
}
raporOlusturBtn.addEventListener('click', guncelleAralikRaporlari);

gunSeciciSelect.addEventListener('change', handleGunSeciciChange);
function renderPersonnelList(personnel) {
    personelListesi.innerHTML = ''; 

    if (!personnel || personnel.length === 0) {
        personelListesi.innerHTML = '<li>Sonuç bulunamadı.</li>';
        return;
    }

  
    const placeholderImage = `
        <svg class="personel-foto" xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#6c757d" viewBox="0 0 16 16">
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </svg>`;

    personnel.forEach(p => {
        const li = document.createElement('li');
        const ad = p.ad || p.Ad || 'AdYok';
        const soyad = p.soyad || p.Soyad || 'SoyadYok';
        const userId = p.userID || p.UserID;
        const fotoBase64 = p.fotoBase64 || p.FotoBase64;

        let imageHtml = placeholderImage;
        if (fotoBase64) {
           
            imageHtml = `<img src="data:image/jpeg;base64,${fotoBase64}" alt="${ad} ${soyad}" class="personel-foto">`;
        }

      
        li.innerHTML = `${imageHtml} <span>${ad} ${soyad}</span>`;

        li.onclick = () => kisiSecildi(userId, `${ad} ${soyad}`, li);
        personelListesi.appendChild(li);
    });
}

function populateDepartmentFilter() {
    const departments = [...new Set(allPersonnel.map(p => p.departman || p.Departman).filter(Boolean))];
    departments.sort();
    departmanFiltreSelect.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departments.forEach(dep => {
        const option = document.createElement('option');
        option.value = dep;
        option.textContent = dep;
        departmanFiltreSelect.appendChild(option);
    });
}

function renderGecGelenler(gecPersonelData) {
    const gecGelenler = gecPersonelData.filter(p => {
        const girisSaati = new Date(p.ilkGiris);
        const gecGirisSiniri = new Date(girisSaati).setHours(8, 30, 0);
        return girisSaati > gecGirisSiniri;
    });
    gecGelenlerListesi.innerHTML = '';
    if (gecGelenler.length === 0) {
        gecGelenlerListesi.innerHTML = '<li>Geç gelen personel yok.</li>';
        return;
    }
    gecGelenler.sort((a, b) => new Date(b.ilkGiris) - new Date(a.ilkGiris));
    gecGelenler.forEach(p => {
        const li = document.createElement('li');
        const girisSaati = new Date(p.ilkGiris).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        li.textContent = `${p.ad} ${p.soyad} (${girisSaati})`;
        gecGelenlerListesi.appendChild(li);
    });
}

function renderGununEnleri(personelData) {
    const enErkenGelen = personelData.reduce((prev, curr) => new Date(prev.ilkGiris) < new Date(curr.ilkGiris) ? prev : curr);
    const enGecCikan = personelData.reduce((prev, curr) => new Date(prev.sonCikis) > new Date(curr.sonCikis) ? prev : curr);
    const erkenSaat = new Date(enErkenGelen.ilkGiris).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const gecSaat = new Date(enGecCikan.sonCikis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    gununEnleriIcerik.innerHTML = `
        <p><strong>En Erken Gelen:</strong><br>${enErkenGelen.ad} ${enErkenGelen.soyad} (${erkenSaat})</p>
        <p><strong>En Geç Çıkan:</strong><br>${enGecCikan.ad} ${enGecCikan.soyad} (${gecSaat})</p>
    `;
}

function renderDepartmanAnalizi(personelData) {
    const departmanlar = {};
    personelData.forEach(p => {
        const dep = p.departman || 'Belirtilmemiş';
        if (!departmanlar[dep]) {
            departmanlar[dep] = { girisler: [], cikislar: [], kisiSayisi: 0 };
        }
        departmanlar[dep].girisler.push(new Date(p.ilkGiris).getTime());
        departmanlar[dep].cikislar.push(new Date(p.sonCikis).getTime());
        departmanlar[dep].kisiSayisi++;
    });
    departmanAnalizIcerik.innerHTML = '';
    for (const dep in departmanlar) {
        const avgGirisMillis = departmanlar[dep].girisler.reduce((a, b) => a + b, 0) / departmanlar[dep].girisler.length;
        const avgCikisMillis = departmanlar[dep].cikislar.reduce((a, b) => a + b, 0) / departmanlar[dep].cikislar.length;
        const avgGirisSaat = new Date(avgGirisMillis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const avgCikisSaat = new Date(avgCikisMillis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const p = document.createElement('p');
        p.innerHTML = `<strong>${dep} (${departmanlar[dep].kisiSayisi} kişi):</strong><br>Ort. Giriş: ${avgGirisSaat} | Ort. Çıkış: ${avgCikisSaat}`;
        departmanAnalizIcerik.appendChild(p);
    }
}



function displayDailyDetails(secilenGun) {
    const tarih = new Date(secilenGun.Tarih || secilenGun.tarih);
    const ilkGiris = new Date(secilenGun.IlkGiris || secilenGun.ilkGiris);
    const sonCikis = new Date(secilenGun.SonCikis || secilenGun.sonCikis);
    const gecGirisSiniri = new Date(tarih).setHours(8, 30, 0);
    const erkenCikisSiniri = new Date(tarih).setHours(17, 10, 0);
    let durumMesaji = '';

    if (ilkGiris > gecGirisSiniri) durumMesaji += 'Geç geldi. ';
    if (sonCikis < erkenCikisSiniri) durumMesaji += 'Erken çıktı.';
    if (durumMesaji === '') durumMesaji = 'Mesai saatlerine uyulmuş.';
    const detayHTML = `
        <strong>Tarih:</strong> ${tarih.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
        <strong>İlk Giriş:</strong> ${ilkGiris.toLocaleTimeString('tr-TR')}<br>
        <strong>Son Çıkış:</strong> ${sonCikis.toLocaleTimeString('tr-TR')}<br>
        <strong>Durum:</strong> <span style="color: ${durumMesaji.includes('uyulmuş') ? 'green' : 'red'};">${durumMesaji}</span>
    `;
    gunlukDetayKutusu.innerHTML = detayHTML;
    gunlukDetayKutusu.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// =================================================================================
// VERİ İŞLEME VE GRAFİK OLUŞTURMA FONKSİYONLARI
// =================================================================================

function processChartData(apiData) {
    const barData = { tarihler: [], mesaiDakika: [], backgroundColors: [], borderColors: [] };
    const donutData = { normal: 0, eksik: 0, fazla: 0 };
    const standartMesaiDakika = 480;
    apiData.forEach(gunlukVeri => {
        const tarih = new Date(gunlukVeri.Tarih || gunlukVeri.tarih);
        if (isNaN(tarih.getTime())) return;
        const ilkGiris = new Date(gunlukVeri.IlkGiris || gunlukVeri.ilkGiris);
        const sonCikis = new Date(gunlukVeri.SonCikis || gunlukVeri.sonCikis);
        const toplamMesai = gunlukVeri.ToplamMesaiDakika || gunlukVeri.toplamMesaiDakika;
        const gecGirisSiniri = new Date(tarih).setHours(8, 30, 0);
        const erkenCikisSiniri = new Date(tarih).setHours(17, 10, 0);
        const isEksik = ilkGiris > gecGirisSiniri || sonCikis < erkenCikisSiniri;
        barData.tarihler.push(tarih.toLocaleDateString('tr-TR'));
        barData.mesaiDakika.push(toplamMesai);
        barData.backgroundColors.push(isEksik ? CHART_COLORS.eksik : CHART_COLORS.normal);
        barData.borderColors.push(isEksik ? CHART_COLORS.eksik_border : CHART_COLORS.normal_border);
        if (isEksik) { donutData.eksik++; }
        else if (toplamMesai > standartMesaiDakika + 30) { donutData.fazla++; }
        else { donutData.normal++; }
    });
    return { barData, donutData };
}

async function fetchAndDisplayPersonelInfo(userId) {
    personelInfoIcerik.innerHTML = '<i>Bilgiler yükleniyor...</i>';
    try {
        const response = await fetch(`/api/data/getinfo/${userId}`);
        if (!response.ok) throw new Error('Personel bilgileri API\'den alınamadı.');

        // DÜZELTME: Gelen JSON'da tek bir eleman olduğu için ilkini ([0]) alıyoruz.
        const infoDataArray = await response.json();
        if (!infoDataArray || infoDataArray.length === 0) throw new Error("Personel bilgisi boş geldi.");
        const infoData = infoDataArray[0];

        const sicilNo = infoData.personleNo || 'N/A';
        const giris = infoData.giris;
        const telefon = infoData.tel || 'N/A';
        const ad = infoData.ad;
        const departman = infoData.departman;

        const soyad = infoData.soyad;
        const fotoBase64 = infoData.foto || infoData.foto;

        const placeholderImage = `
        <svg class="personel-info-foto" xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#6c757d" viewBox="0 0 16 16">
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </svg>`;

        
            

            let imageHtml = placeholderImage;
            if (fotoBase64) {
                imageHtml = `<img src="data:image/jpeg;base64,${fotoBase64}" alt="${ad} ${soyad}" class="personel-info-foto">`;
            }

        userId = parseInt(userId);
        const infoHtml = `
          <div class="personel-info-content">
                    ${imageHtml}

          <p><strong>Ad:</strong> ${ad}</p>
            <p><strong>Soyad:</strong> ${soyad}</p>
            <p><strong>USER No:</strong> ${userId}</p>
            <p><strong>Departman:</strong> ${departman}</p>
            <p><strong>İşe Giriş Tarihi:</strong> ${giris}</p>
            <p><strong>Telefon:</strong> ${telefon}</p>
            <a href="personel-detay.html?userId=${userId}" target="_blank" class="profil-goruntule-btn">Profili Görüntüle</a>

            </div>
        `;
        personelInfoIcerik.innerHTML = infoHtml;

    } catch (error) {
        console.error("Personel info alınırken hata:", error);
        personelInfoIcerik.innerHTML = '<span style="color: red;">Bilgiler yüklenemedi.</span>';
    }
}
const personelInfoKarti = document.getElementById('personel-info-karti');
const anaGrafikAlani = document.getElementById('anaGrafikAlani');
const chartsSectionContainer = document.getElementById('charts-section-container');

function kisiSecildi(userId, adSoyad, clickedListItem) {
    document.querySelectorAll('#personelListesi li').forEach(item => item.classList.remove('selected'));
    if (clickedListItem) clickedListItem.classList.add('selected');


    chartsSectionContainer.style.display = 'flex'; 
    fetchAndDisplayPersonelInfo(userId);

    kisiDetayBaslik.textContent = `${adSoyad} - Mesai Detayları`;
    gunlukDetayKutusu.innerHTML = 'Veriler yükleniyor...';

    kisiDetayBaslik.style.display = 'block';
    gunlukDetayKutusu.style.display = 'block';
    personelInfoKarti.style.display = 'flex';
   // anaGrafikAlani.style.display = 'flex';

    if (mesaiChart) mesaiChart.destroy();
    if (durumChart) durumChart.destroy();
    gunSeciciSelect.innerHTML = '<option value="">Yükleniyor...</option>';


    fetch(`/api/data/mesai/${userId}`)
        .then(response => response.json())
        .then(apiData => {
            currentPersonApiData = apiData;
            if (apiData.length === 0) {


                chartsSectionContainer.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!'; 
                gunlukDetayKutusu.innerHTML = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
                personelInfoKarti.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
             //   anaGrafikAlani.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
                return;
            }

            barChartContainer.style.display = 'block';
            donutChartContainer.style.display = 'block';

            const processedData = processChartData(apiData);
            createBarChart(processedData.barData, apiData);
            createDoughnutChart(processedData.donutData);
            gunlukDetayKutusu.innerHTML = 'Detayları görmek için yukarıdaki grafikte bir güne tıklayın veya menüden bir gün seçin.';
        })
        .catch(error => {
            console.error('Mesai detayı alınırken hata:', error);
            gunlukDetayKutusu.innerHTML = 'Mesai verileri yüklenirken bir hata oluştu.';
        });


    raporPaneli.classList.add('panel-compact');
    toggleSizeIcon.innerHTML = expandIcon;
    toggleSizeLabel.textContent = "Görünümü Büyüt";

    
    kisiDetayBaslik.scrollIntoView({ behavior: 'smooth', block: 'center' });

}

/**
 * @param {Object} barData
 * @param {Array} apiData 
 */
function createBarChart(barData, apiData) {
    const ctx = document.getElementById('mesaiChart').getContext('2d');
    populateGunSecici(barData.tarihler);

    mesaiChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: barData.tarihler,
            datasets: [{
                label: 'Toplam Mesai (Dakika)',
                data: barData.mesaiDakika,
                backgroundColor: barData.backgroundColors,
                borderColor: barData.borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: {
                title: { display: true, text: 'Günlük Mesai Süreleri' },
                annotation: {
                    annotations: {
                        altSinirCizgisi: {
                            type: 'line', yMin: 510, yMax: 510,
                            borderColor: CHART_COLORS.eksik_border, borderWidth: 2, borderDash: [8, 4],
                            label: {
                                display: true, content: 'Asgari Mesai Sınırı (510 dk)', position: 'end',
                                backgroundColor: CHART_COLORS.eksik, color: 'white', padding: 6, font: { weight: 'bold' }
                            }
                        }
                    }
                },
      
                datalabels: {
                    display: false
                }
            },
            onClick: (event, elements) => {
                if (elements.length === 0) return;
                const index = elements[0].index;
                displayDailyDetails(apiData[index]);
                gunSeciciSelect.value = index;
            }
        }
    });
}

function createDoughnutChart(donutData) {
    document.getElementById('donutChartContainer').style.display = 'block';
    const ctx = document.getElementById('durumChart').getContext('2d');

    const dataValues = [donutData.normal, donutData.eksik, donutData.fazla];
    const total = dataValues.reduce((acc, val) => acc + val, 0); // Tüm günlerin toplamı

    durumChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Normal Gün', 'Eksik Mesaili Gün', 'Fazla Mesaili Gün'],
            datasets: [{
                data: dataValues,
                backgroundColor: [CHART_COLORS.normal, CHART_COLORS.eksik, CHART_COLORS.fazla],
                borderColor: ['#fff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Mesai Durum Dağılımı'
                },
              
                datalabels: {
                   
                    formatter: (value, context) => {
                        if (total === 0) return '0%'; 
                       
                        const percentage = (value / total * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#ffffff', 
                    font: {
                        weight: 'bold',
                        size: 14,
                    }
                }
            }
        }
    });

}



function toggleCardSize() {
    raporPaneli.classList.toggle('panel-compact'); // DÜZELTME: Doğru konteynere sınıf ekleniyor
    if (raporPaneli.classList.contains('panel-compact')) {
        toggleSizeIcon.innerHTML = expandIcon;
        toggleSizeLabel.textContent = "Görünümü Büyüt";
    } else {
        toggleSizeIcon.innerHTML = compressIcon;
        toggleSizeLabel.textContent = "Görünümü Küçült";
    }
}

toggleSizeBtn.addEventListener('click', toggleCardSize);

toggleSizeIcon.innerHTML = compressIcon;
toggleSizeLabel.textContent = "Görünümü Küçült";





const infoModal = document.getElementById('info-modal');
const photoLightbox = document.getElementById('photo-lightbox');
const lightboxImage = document.getElementById('lightbox-image');

personelInfoKarti.addEventListener('click', () => {
    const contentToCopy = personelInfoIcerik.innerHTML;
    if (contentToCopy && !contentToCopy.includes('<i>')) {
        modalBody.innerHTML = contentToCopy;
        openModal(infoModal);
    }
});



document.querySelectorAll('[data-close-modal]').forEach(item => {
    item.addEventListener('click', () => {
        closeAllModals();
    });
});


function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-visible');
    document.body.classList.add('modal-open');
}


function closeAllModals() {
    document.querySelectorAll('.modal.is-visible').forEach(modal => {
        modal.classList.remove('is-visible');
    });
    document.body.classList.remove('modal-open');
}







// =================================================================================
// RAPOR SEKMELERİ MANTIĞI
// =================================================================================
const raporSekmeleriContainer = document.querySelector('.rapor-sekmeleri');
const raporIcerikAlanlari = document.querySelectorAll('.rapor-icerik-alani');

raporSekmeleriContainer.addEventListener('click', (event) => {

    raporPaneli.classList.remove('panel-compact');
    toggleSizeIcon.innerHTML = compressIcon;
    toggleSizeLabel.textContent = "Görünümü Küçült";
    // Tıklanan elemanın bir sekme butonu olduğundan emin ol
    const tiklananSekme = event.target.closest('.sekme-buton');
    if (!tiklananSekme) return;

    // Tüm sekme butonlarından 'aktif' sınıfını kaldır
    raporSekmeleriContainer.querySelectorAll('.sekme-buton').forEach(btn => {
        btn.classList.remove('aktif');
    });

    // Sadece tıklanan sekmeye 'aktif' sınıfını ekle
    tiklananSekme.classList.add('aktif');

    // İlgili rapor kartını göster, diğerlerini gizle
    const raporTuru = tiklananSekme.dataset.rapor;
    raporIcerikAlanlari.forEach(alan => {
        if (alan.id === `rapor-${raporTuru}`) {
            alan.classList.add('aktif');
        } else {
            alan.classList.remove('aktif');
        }
    });
});









// =================================================================================
// GRAFİK SEKMELERİ MANTIĞI
// =================================================================================
const grafikSekmeleriContainer = document.querySelector('.grafik-sekmeleri');
const grafikIcerikAlanlari = document.querySelectorAll('.grafik-icerik-alani');

grafikSekmeleriContainer.addEventListener('click', (event) => {
    const tiklananSekme = event.target.closest('.sekme-buton');
    if (!tiklananSekme) return;

    grafikSekmeleriContainer.querySelectorAll('.sekme-buton').forEach(btn => {
        btn.classList.remove('aktif');
    });
    tiklananSekme.classList.add('aktif');

    const grafikTuru = tiklananSekme.dataset.grafik;
    grafikIcerikAlanlari.forEach(alan => {
        if (alan.id === `grafik-${grafikTuru}`) {
            alan.classList.add('aktif');
        } else {
            alan.classList.remove('aktif');
        }
    });
});



// script.js en altı

// "Erken Çıkanlar" listesindeki tıklamaları dinle
erkenCikanlarListesi.addEventListener('click', (event) => {
    const gosterButonu = event.target.closest('.goster-btn');
    if (gosterButonu) {
        const userId = gosterButonu.dataset.userid;
        const adSoyad = gosterButonu.dataset.adsoyad;
        const baslangic = document.getElementById('baslangicTarih').value;
        const bitis = document.getElementById('bitisTarih').value;

        showErkenCikmaDetayModal(userId, adSoyad, baslangic, bitis);
    }
});

/**
 * Belirtilen kişi için erken çıktığı günleri modal'da gösterir.
 */
async function showErkenCikmaDetayModal(userId, adSoyad, baslangic, bitis) {
    // Modal'ı aç ve yükleniyor mesajı göster
    modalBodydetay.innerHTML = `<h4>${adSoyad} - Erken Çıktığı Günler</h4><p>Yükleniyor...</p>`;
    openModal(detayModal);

    try {
        const response = await fetch(`/api/data/erken-cikma-detaylari?userId=${userId}&baslangic=${baslangic}&bitis=${bitis}`);
        if (!response.ok) throw new Error("Detaylar alınamadı.");
        const detaylar = await response.json();

        if (detaylar.length === 0) {
            modalBodydetay.innerHTML = `<h4>${adSoyad} - Erken Çıktığı Günler</h4><p>Listelenecek tarih bulunamadı.</p>`;
            return;
        }

        // Gelen tarihleri liste olarak formatla
        let listeHtml = `<ul class="detay-modal-liste">`;
        detaylar.forEach(detay => {
            const tarih = new Date(detay.tarih).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const cikisSaati = new Date(detay.sonCikis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            listeHtml += `<li><strong>${tarih}:</strong> ${cikisSaati}</li>`;
        });
        listeHtml += `</ul>`;

        modalBodydetay.innerHTML = `<h4>${adSoyad} - Erken Çıktığı Günler</h4>${listeHtml}`;

    } catch (error) {
        console.error("Erken çıkma detayları alınırken hata:", error);
        modalBodydetay.innerHTML = `<h4>${adSoyad} - Erken Çıktığı Günler</h4><p style="color:red;">Detaylar yüklenirken bir hata oluştu.</p>`;
    }
}

// script.js en altı

// "Devamsızlar" listesindeki tıklamaları dinle
gelmeyenlerListesi.addEventListener('click', (event) => {
    const gosterButonu = event.target.closest('.goster-btn');
    if (gosterButonu) {
        const userId = gosterButonu.dataset.userid;
        const adSoyad = gosterButonu.dataset.adsoyad;
        const baslangic = document.getElementById('baslangicTarih').value;
        const bitis = document.getElementById('bitisTarih').value;

        showDevamsizlikDetayModal(userId, adSoyad, baslangic, bitis);
    }
});

/**
 * Belirtilen kişi için devamsızlık yaptığı günleri modal'da gösterir.
 */
async function showDevamsizlikDetayModal(userId, adSoyad, baslangic, bitis) {
    modalBodydetay.innerHTML = `<h4>${adSoyad} - Devamsızlık Yaptığı Günler</h4><p>Yükleniyor...</p>`;
    openModal(detayModal);

    try {
        // Backend'deki yeni API'yi çağırıyoruz
        const response = await fetch(`/api/data/getDevamsizDetay?userId=${userId}&baslangic=${baslangic}&bitis=${bitis}`);
        if (!response.ok) throw new Error("Detaylar alınamadı.");
        const detaylar = await response.json();

        if (detaylar.length === 0) {
            modalBodydetay.innerHTML = `<h4>${adSoyad} - Devamsızlık Yaptığı Günler</h4><p>Listelenecek tarih bulunamadı.</p>`;
            return;
        }

        // Gelen tarihleri liste olarak formatla
        let listeHtml = `<ul class="detay-modal-liste">`;
        detaylar.forEach(detay => {
            const tarih = new Date(detay.tarih).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            listeHtml += `<li>${tarih}</li>`;
        });
        listeHtml += `</ul>`;

        modalBodydetay.innerHTML = `<h4>${adSoyad} - Devamsızlık Yaptığı Günler</h4>${listeHtml}`;

    } catch (error) {
        console.error("Devamsızlık detayları alınırken hata:", error);
        modalBodydetay.innerHTML = `<h4>${adSoyad} - Devamsızlık Yaptığı Günler</h4><p style="color:red;">Detaylar yüklenirken bir hata oluştu.</p>`;
    }
}






// script.js en altı

// "Fazla Mesai" listesindeki tıklamaları dinle
fazlaMesaiListesi.addEventListener('click', (event) => {
    const gosterButonu = event.target.closest('.goster-btn');
    if (gosterButonu) {
        const userId = gosterButonu.dataset.userid;
        const adSoyad = gosterButonu.dataset.adsoyad;
        const baslangic = document.getElementById('baslangicTarih').value;
        const bitis = document.getElementById('bitisTarih').value;

        showFazlaMesaiDetayModal(userId, adSoyad, baslangic, bitis);
    }
});

/**
 * Belirtilen kişi için fazla mesai yaptığı günleri modal'da gösterir.
 */
async function showFazlaMesaiDetayModal(userId, adSoyad, baslangic, bitis) {
    modalBodydetay.innerHTML = `<h4>${adSoyad} - Fazla Mesai Detayları</h4><p>Yükleniyor...</p>`;
    openModal(detayModal);

    try {
        const response = await fetch(`/api/data/fazla-mesai-detaylari?userId=${userId}&baslangic=${baslangic}&bitis=${bitis}`);
        if (!response.ok) throw new Error("Detaylar alınamadı.");
        const detaylar = await response.json();

        if (detaylar.length === 0) {
            modalBodydetay.innerHTML = `<h4>${adSoyad} - Fazla Mesai Detayları</h4><p>Listelenecek tarih bulunamadı.</p>`;
            return;
        }

        let listeHtml = `<ul class="detay-modal-liste">`;
        detaylar.forEach(detay => {
            const tarih = new Date(detay.tarih).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const cikisSaati = new Date(detay.sonCikis).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const mesaiDakika = detay.fazlaMesaiDakika;
            const saat = Math.floor(mesaiDakika / 60);
            const dakika = mesaiDakika % 60;
            let mesaiSuresi = '';
            if (saat > 0) mesaiSuresi += `${saat} saat `;
            if (dakika > 0) mesaiSuresi += `${dakika} dakika`;

            listeHtml += `<li><strong>${tarih}:</strong> ${cikisSaati} (+${mesaiSuresi.trim()})</li>`;
        });
        listeHtml += `</ul>`;

        modalBodydetay.innerHTML = `<h4>${adSoyad} - Fazla Mesai Detayları</h4>${listeHtml}`;

    } catch (error) {
        console.error("Fazla mesai detayları alınırken hata:", error);
        modalBodydetay.innerHTML = `<h4>${adSoyad} - Fazla Mesai Detayları</h4><p style="color:red;">Detaylar yüklenirken bir hata oluştu.</p>`;
    }
}





// script.js en altı

// "Departman Analizi" listesindeki tıklamaları dinle
departmanAnalizIcerik.addEventListener('click', (event) => {
    const gosterButonu = event.target.closest('.goster-btn');
    if (gosterButonu) {
        const departmanAdi = gosterButonu.dataset.departman;
        showDepartmanDetayModal(departmanAdi);
    }
});

/**
 * Belirtilen departmandaki personellerin performans özetini modal'da gösterir.
 */
function showDepartmanDetayModal(departmanAdi) {
    // İlgili departmandaki personelleri global veriden filtrele
    const departmanPersoneli = currentAralikPersonelOzetleri.filter(p => (p.Departman || p.departman) === departmanAdi);

    // Modal için bir HTML tablosu oluştur
    let tabloHtml = `
        <h4>${departmanAdi} - Personel Detayları</h4>
        <table class="detay-modal-tablo">
            <thead>
                <tr>
                    <th>Ad Soyad</th>
                    <th>Geç Kalma</th>
                    <th>Erken Çıkma</th>
                    <th>Fazla Mesai</th>
                </tr>
            </thead>
            <tbody>
    `;

    departmanPersoneli.forEach(p => {
        const gecKalma = p.gecKalmaSayisi || p.GecKalmaSayisi;
        const erkenCikma = p.erkenCikmaSayisi || p.ErkenCikmaSayisi;
        const mesaiDakika = p.toplamFazlaMesaiDakika || p.ToplamFazlaMesaiDakika;

        let mesaiSuresi = "-";
        if (mesaiDakika > 0) {
            const saat = Math.floor(mesaiDakika / 60);
            const dakika = mesaiDakika % 60;
            mesaiSuresi = `+${saat}s ${dakika}d`;
        }

        tabloHtml += `
            <tr>
                <td>${p.Ad || p.ad} ${p.Soyad || p.soyad}</td>
                <td>${gecKalma} kez</td>
                <td>${erkenCikma} kez</td>
                <td>${mesaiSuresi}</td>
            </tr>
        `;
    });

    tabloHtml += `</tbody></table>`;

    // Modal'ı aç ve oluşturulan tabloyu içine yerleştir
    modalBodydetay.innerHTML = tabloHtml;
    openModal(detayModal);
}