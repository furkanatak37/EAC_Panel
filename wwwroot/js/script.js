// =================================================================================
// GLOBAL DEĞİŞKENLER VE SABİTLER
// =================================================================================

// HTML Elementleri
// script.js dosyasının en üstü

// ... diğer const tanımlamalarından sonra
const personelInfoIcerik = document.getElementById('personel-info-icerik');
const personelListesi = document.getElementById('personelListesi');
const detayBaslik = document.getElementById('detayBaslik');
const adFiltreInput = document.getElementById('adFiltre');
const departmanFiltreSelect = document.getElementById('departmanFiltre');
const raporTarihInput = document.getElementById('raporTarih');
const gununEnleriIcerik = document.getElementById('gunun-enleri-icerik');
const gecGelenlerListesi = document.getElementById('gec-gelenler-listesi');
const erkenCikanlarListesi = document.getElementById('erken-cikanlar-listesi');

const departmanAnalizIcerik = document.getElementById('departman-analiz-icerik');
const fazlaMesaiListesi = document.getElementById('fazla-mesai-listesi');
// Kişi detayları için elementler
const baslangicTarihInput = document.getElementById('baslangicTarih');
const bitisTarihInput = document.getElementById('bitisTarih');
const raporOlusturBtn = document.getElementById('raporOlusturBtn');
const departmanDetayBtn = document.getElementById('departman-detay-btn');
const erkenCikanlarDetayBtn = document.getElementById('erken-cikanlar-detay-btn');


// Olay dinleyicilerini güncelleyin (raporTarihInput'u kaldırıp raporOlusturBtn'yi ekleyin)
raporOlusturBtn.addEventListener('click', guncelleAralikRaporlari);

const gecGelenlerDetayBtn = document.getElementById('gec-gelenler-detay-btn');
const fazlaMesaiDetayBtn = document.getElementById('fazla-mesai-detay-btn');

const kisiDetayBaslik = document.getElementById('kisiDetayBaslik');
const barChartContainer = document.getElementById('barChartContainer');
const donutChartContainer = document.getElementById('donutChartContainer');
const gunlukDetayKutusu = document.getElementById('gunlukDetay');
// ... diğer const tanımlamalarından sonra
const gunSeciciSelect = document.getElementById('gunSecici');
// =================================================================================
// EKLENTİ KAYDI
// =================================================================================
Chart.register(ChartDataLabels); // Datalabels eklentisini tüm grafikler için aktif et

// =================================================================================
// GLOBAL DEĞİŞKENLER VE SABİTLER
// =================================================================================
// ... (dosyanın geri kalanı aynı)
// ... diğer let tanımlamalarından sonra
let currentPersonApiData = []; // Aktif olarak seçili kişinin tüm gün verisini tutmak için
// Durum Değişkenleri
let mesaiChart = null;
let durumChart = null;
let allPersonnel = []; // API'den gelen tüm personeli saklamak için

// Sabitler
const CHART_COLORS = {
    normal: 'rgba(75, 192, 192, 0.6)',
    eksik: 'rgba(255, 99, 132, 0.6)',
    fazla: 'rgba(54, 162, 235, 0.6)',
    normal_border: 'rgba(75, 192, 192, 1)',
    eksik_border: 'rgba(255, 99, 132, 1)',
};
/**
 * Grafikteki tarihlerle gün seçici dropdown'ını doldurur.
 * @param {Array<string>} tarihler - Grafikteki tarih etiketleri dizisi.
 */
function populateGunSecici(tarihler) {
    gunSeciciSelect.innerHTML = '<option value="">Tarih Seçin...</option>'; // Başlangıç metni
    tarihler.forEach((tarih, index) => {
        const option = document.createElement('option');
        option.value = index; // Değer olarak dizideki sırasını (index) veriyoruz
        option.textContent = tarih;
        gunSeciciSelect.appendChild(option);

    });
}

/**
 * Dropdown'dan bir gün seçildiğinde tetiklenir.
 */



function handleGunSeciciChange() {
    const selectedIndex = parseInt(gunSeciciSelect.value);

    if (isNaN(selectedIndex)) { // "Tarih Seçin..." seçeneği seçilirse bir şey yapma
        mesaiChart.setActiveElements([]); // Grafikteki aktif seçimi kaldır
        mesaiChart.update();
        return;
    }

    // İlgili günün detaylarını göster
    displayDailyDetails(currentPersonApiData[selectedIndex]);

    // Grafikteki ilgili çubuğu programatik olarak "aktif" (vurgulu) hale getir
    mesaiChart.setActiveElements([{ datasetIndex: 0, index: selectedIndex }]);
    mesaiChart.update();
}

// =================================================================================
// OLAY DİNLEYİCİLERİ VE BAŞLANGIÇ
// =================================================================================

// Sayfa yüklendiğinde ve DOM hazır olduğunda uygulamayı başlat
document.addEventListener('DOMContentLoaded', initializePage);

// Filtre inputları değiştiğinde filtreleme fonksiyonunu çağır
adFiltreInput.addEventListener('input', applyFilters);
gunSeciciSelect.addEventListener('change', handleGunSeciciChange);
departmanFiltreSelect.addEventListener('change', applyFilters);
//raporTarihInput.addEventListener('change', () => guncelleGunlukRaporlar(raporTarihInput.value));
/**
 * Fazla mesai yapanları listeler.
 * @param {Array} personelData - O güne ait tüm personel verisi.
 */
function renderFazlaMesai(personelData) {
    // Sadece fazla mesaisi 0'dan büyük olanları filtrele
    const mesaiYapanlar = personelData.filter(p => (p.FazlaMesaiDakika || p.fazlaMesaiDakika) > 0);

    fazlaMesaiListesi.innerHTML = '';
    if (mesaiYapanlar.length === 0) {
        fazlaMesaiListesi.innerHTML = '<li>Fazla mesai yapan personel yok.</li>';
        return;
    }

    // En çok mesai yapanı en üste al
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
/**
 * Grafikteki tarihlerle gün seçici dropdown'ını doldurur.
 * @param {Array<string>} tarihler - Grafikteki tarih etiketleri dizisi.
 */
function populateGunSecici(tarihler) {
    gunSeciciSelect.innerHTML = '<option value="">Tarih Seçin...</option>'; // Başlangıç metni
    tarihler.forEach((tarih, index) => {
        const option = document.createElement('option');
        option.value = index; // Değer olarak dizideki sırasını (index) veriyoruz
        option.textContent = tarih;
        gunSeciciSelect.appendChild(option);
    });
}

/**
 * Dropdown'dan bir gün seçildiğinde tetiklenir.
 */
function handleGunSeciciChange() {
    const selectedIndex = parseInt(gunSeciciSelect.value);

    if (isNaN(selectedIndex)) { // "Tarih Seçin..." seçeneği seçilirse bir şey yapma
        mesaiChart.setActiveElements([]); // Grafikteki aktif seçimi kaldır
        mesaiChart.update();
        return;
    }

    // İlgili günün detaylarını göster
    displayDailyDetails(currentPersonApiData[selectedIndex]);

    // Grafikteki ilgili çubuğu programatik olarak "aktif" (vurgulu) hale getir
    mesaiChart.setActiveElements([{ datasetIndex: 0, index: selectedIndex }]);
    mesaiChart.update();
}
// =================================================================================
// ANA KONTROL FONKSİYONLARI
// =================================================================================

/**
 * Sayfa ilk yüklendiğinde çalışacak ana fonksiyon.
 */
/**
 * Sayfa ilk yüklendiğinde çalışacak ana fonksiyon.
 */
function initializePage() {
    // Varsayılan olarak bu ayın başlangıcını ve sonunu ayarla
    const today = new Date();
    const ayinIlkGunu = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const ayinSonGunu = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    baslangicTarihInput.value = ayinIlkGunu;
    bitisTarihInput.value = ayinSonGunu;

    setInitialReportState(); // Başlangıç mesajlarını göster
    personelleriGetir();
    guncelleAralikRaporlari(); // Sayfa ilk açıldığında varsayılan aralık için raporu getir
}

/**
 * Rapor kartlarını başlangıç durumuna getirir ve kullanıcıya mesaj gösterir.
 */
function setInitialReportState() {
    const initialMessage = 'Raporu görüntülemek için lütfen bir tarih seçin.';
    gecGelenlerListesi.innerHTML = `<li>${initialMessage}</li>`;
    erkenCikanlarListesi.innerHTML = `<li>${initialMessage}</li>`;

    gununEnleriIcerik.innerHTML = `<p>${initialMessage}</p>`;
    departmanAnalizIcerik.innerHTML = `<p>${initialMessage}</p>`;
}
/**
 * API'den tüm personellerin listesini çeker.
 */
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

/**
 * Belirtilen tarih için tüm günlük raporları getirir ve günceller.
 * @param {string} tarihString - 'YYYY-MM-DD' formatında tarih.
 */
// guncelleGunlukRaporlar fonksiyonunun içini aşağıdaki gibi güncelleyin

// script.js dosyanızdaki mevcut guncelleAralikRaporlari ve ilgili render fonksiyonlarını
// aşağıdaki tam ve güncel halleriyle değiştirin.

async function guncelleAralikRaporlari() {
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


    gecGelenlerListesi.innerHTML = '<li>Yükleniyor...</li>';
    erkenCikanlarListesi.innerHTML = '<li>Yükleniyor...</li>';

    fazlaMesaiListesi.innerHTML = '<li>Yükleniyor...</li>';
    gununEnleriIcerik.innerHTML = '<p>Yükleniyor...</p>';
    departmanAnalizIcerik.innerHTML = '<p>Yükleniyor...</p>';

    try {
        const response = await fetch(`/api/data/aralik-raporu?baslangic=${baslangic}&bitis=${bitis}`);
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
        const data = await response.json();

        // Gelen verinin yeni yapısına göre ilgili render fonksiyonlarını çağır
        renderGecKalanlarAralik(data.personelOzetleri || []);
        renderErkenCikanlarAralik(data.personelOzetleri || []);

        renderFazlaMesaiAralik(data.personelOzetleri || []);
        renderAraliginEnleri(data.araliginEnleri);
        renderDepartmanAnaliziAralik(data.departmanOzetleri || []);

    } catch (error) {
        console.error("Aralık raporu alınırken hata:", error);
        const errorMessage = '<li>Rapor alınamadı.</li>';
        gecGelenlerListesi.innerHTML = errorMessage;
        erkenCikanlarListesi.innerHTML = errorMessage;

        fazlaMesaiListesi.innerHTML = errorMessage;
        gununEnleriIcerik.innerHTML = '<p>Hata!</p>';
        departmanAnalizIcerik.innerHTML = '<p>Hata!</p>';
    }
}

function renderGecKalanlarAralik(personelOzetleri) {
    const gecKalanlar = personelOzetleri.filter(p => (p.gecKalmaSayisi || p.GecKalmaSayisi) > 0);
    gecGelenlerListesi.innerHTML = '';
    if (gecKalanlar.length === 0) {
        gecGelenlerListesi.innerHTML = '<li>Bu aralıkta geç kalan personel bulunamadı.</li>';
        return;
    }
    gecKalanlar.sort((a, b) => (b.gecKalmaSayisi || b.GecKalmaSayisi) - (a.gecKalmaSayisi || a.GecKalmaSayisi));
    gecKalanlar.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.Ad || p.ad} ${p.Soyad || p.soyad} (${p.gecKalmaSayisi || p.GecKalmaSayisi} kez)`;
        gecGelenlerListesi.appendChild(li);
    });
}

/**
 * Gelen özet verisine göre "Erken Çıkanlar" kartını doldurur.
 */
function renderErkenCikanlarAralik(personelOzetleri) {
    // Backend'den 'ErkenCikmaSayisi' adında bir veri bekliyoruz.
    // Eğer bu veri yoksa, fonksiyon çalışmaz. Lütfen C# kodunuzu kontrol edin.
    const erkenCikanlar = personelOzetleri.filter(p => (p.erkenCikmaSayisi || p.ErkenCikmaSayisi) > 0);

    erkenCikanlarListesi.innerHTML = ''; // Listeyi temizle

    if (erkenCikanlar.length === 0) {
        erkenCikanlarListesi.innerHTML = '<li>Bu aralıkta erken çıkan personel bulunamadı.</li>';
        return;
    }

    // En çok erken çıkandan en aza doğru sırala
    erkenCikanlar.sort((a, b) => (b.erkenCikmaSayisi || b.ErkenCikmaSayisi) - (a.erkenCikmaSayisi || a.ErkenCikmaSayisi));

    erkenCikanlar.forEach(p => {
        const li = document.createElement('li');
        const erkenCikmaSayisi = p.erkenCikmaSayisi || p.ErkenCikmaSayisi;
        const adSoyad = `${p.Ad || p.ad} ${p.Soyad || p.soyad}`;
        li.textContent = `${adSoyad} (${erkenCikmaSayisi} kez)`;
        erkenCikanlarListesi.appendChild(li);
    });
}

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
        li.textContent = `${p.Ad || p.ad} ${p.Soyad || p.soyad} (+${mesaiSuresi.trim()})`;
        fazlaMesaiListesi.appendChild(li);
    });
}


function renderAraliginEnleri(enlerData) {
    gununEnleriIcerik.innerHTML = ''; // Önceki içeriği temizle

    if (!enlerData || enlerData.length === 0) {
        gununEnleriIcerik.innerHTML = '<p>Bu aralık için özet bilgi bulunamadı.</p>';
        return;
    }

    // Her gün için bir HTML bloğu oluşturup ekleyelim
    const fragment = document.createDocumentFragment();
    enlerData.forEach(gununEni => {
        const gunDiv = document.createElement('div');
        gunDiv.className = 'gunun-eni-item'; // Stil için class ataması

        const tarih = new Date(gununEni.tarih).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' });
        const erkenSaat = new Date(gununEni.enErkenGelisSaati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const gecSaat = new Date(gununEni.enGecCikisSaati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        gunDiv.innerHTML = `
            <p class="gunun-eni-tarih"><strong>${tarih}</strong></p>
            <p><strong>Erken Gelen:</strong> ${gununEni.enErkenGelenIsim} (${erkenSaat})</p>
            <p><strong>Geç Çıkan:</strong> ${gununEni.enGecCikanIsim} (${gecSaat})</p>
        `;
        fragment.appendChild(gunDiv);
    });

    gununEnleriIcerik.appendChild(fragment);
}

/**
 * "Departman Analizi" kartını doldurur.
 */
function renderDepartmanAnaliziAralik(departmanOzetleri) {
    departmanAnalizIcerik.innerHTML = '';
    if (departmanOzetleri.length === 0) {
        departmanAnalizIcerik.innerHTML = '<p>Analiz edilecek departman verisi yok.</p>';
        return;
    }

    departmanOzetleri.forEach(dep => {
        const p = document.createElement('p');
        // SQL'den gelen 'HH:mm:ss.fffffff' formatını 'HH:mm' olarak göstermek için substring kullanıyoruz.
        const ortGiris = dep.ortalamaGiris.substring(0, 5);
        const ortCikis = dep.ortalamaCikis.substring(0, 5);

        p.innerHTML = `<strong>${dep.departman} (${dep.kisiSayisi} kişi):</strong><br>Ort. Giriş: ${ortGiris} | Ort. Çıkış: ${ortCikis}`;
        departmanAnalizIcerik.appendChild(p);
    });
}

/**
 * Bir kişiye tıklandığında çalışan ana fonksiyon.
 */


// =================================================================================
// ARAYÜZ GÜNCELLEME VE RENDER FONKSİYONLARI
// =================================================================================

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

// script.js dosyasındaki renderPersonnelList fonksiyonunu aşağıdakiyle değiştirin.

/**
 * Verilen personel dizisini alıp fotoğraflı HTML listesini oluşturur.
 */
function renderPersonnelList(personnel) {
    personelListesi.innerHTML = ''; // Mevcut listeyi temizle

    if (!personnel || personnel.length === 0) {
        personelListesi.innerHTML = '<li>Sonuç bulunamadı.</li>';
        return;
    }

    // Fotoğrafı olmayanlar için varsayılan bir yer tutucu (SVG formatında)
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
            // Eğer fotoğraf verisi varsa, data URL formatında bir <img> etiketi oluştur.
            imageHtml = `<img src="data:image/jpeg;base64,${fotoBase64}" alt="${ad} ${soyad}" class="personel-foto">`;
        }

        // Liste elemanının içeriğini resim ve isimle doldur.
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
/**
 * Belirtilen personelin detay bilgilerini API'den çeker ve info kartında gösterir.
 * @param {number} userId - Bilgileri getirilecek personelin ID'si.
 */
async function fetchAndDisplayPersonelInfo(userId) {
    personelInfoIcerik.innerHTML = '<i>Bilgiler yükleniyor...</i>';
    try {
        const response = await fetch(`/api/data/getinfo/${userId}`);
        if (!response.ok) throw new Error('Personel bilgileri API\'den alınamadı.');

        // DÜZELTME: Gelen JSON'da tek bir eleman olduğu için ilkini ([0]) alıyoruz.
        const infoDataArray = await response.json();
        if (!infoDataArray || infoDataArray.length === 0) throw new Error("Personel bilgisi boş geldi.");
        const infoData = infoDataArray[0];

        // DÜZELTME: API'den gelen gerçek kolon adları (userID, giris, tel vb.) kullanıldı.
        const sicilNo = infoData.personleNo || 'N/A';
        const giris = infoData.giris;
        const telefon = infoData.tel || 'N/A';
        const ad = infoData.ad;
        const soyad = infoData.soyad;


        const infoHtml = `
          <p><strong>Ad:</strong> ${ad}</p>
            <p><strong>Soyad:</strong> ${soyad}</p>
            <p><strong>Personel No:</strong> ${sicilNo}</p>
            <p><strong>USER No:</strong> ${userId}</p>
            <p><strong>İşe Giriş Tarihi:</strong> ${giris}</p>
            <p><strong>Telefon:</strong> ${telefon}</p>
        `;
        personelInfoIcerik.innerHTML = infoHtml;

    } catch (error) {
        console.error("Personel info alınırken hata:", error);
        personelInfoIcerik.innerHTML = '<span style="color: red;">Bilgiler yüklenemedi.</span>';
    }
}
// script.js dosyasından ilgili elementleri en üste ekleyin
const personelInfoKarti = document.getElementById('personel-info-karti');
const anaGrafikAlani = document.getElementById('anaGrafikAlani');


// kisiSecildi fonksiyonunu aşağıdakiyle güncelleyin

// script.js dosyanızdaki bu fonksiyonu güncelleyin

function kisiSecildi(userId, adSoyad, clickedListItem) {
    // 1. Arayüzü güncelle
    document.querySelectorAll('#personelListesi li').forEach(item => item.classList.remove('selected'));
    if (clickedListItem) clickedListItem.classList.add('selected');

    // 2. Personel Info kartını doldurmaya başla
    fetchAndDisplayPersonelInfo(userId);

    // 3. Grafik ve info alanlarını ve başlıkları ayarla
    kisiDetayBaslik.textContent = `${adSoyad} - Mesai Detayları`;
    gunlukDetayKutusu.innerHTML = 'Veriler yükleniyor...';

    // GÖRÜNÜRLÜK AYARLARI
    kisiDetayBaslik.style.display = 'block';
    gunlukDetayKutusu.style.display = 'block';
    personelInfoKarti.style.display = 'flex';
    anaGrafikAlani.style.display = 'flex';

    // 4. Önceki grafikleri temizle
    if (mesaiChart) mesaiChart.destroy();
    if (durumChart) durumChart.destroy();
    gunSeciciSelect.innerHTML = '<option value="">Yükleniyor...</option>';

    // === YENİ EKLENEN SATIR: EKRANI AŞAĞI KAYDIRMA ===
    // Grafik başlığına doğru yumuşak bir şekilde kaydır.

    // 5. Yeni grafik verilerini çek ve oluştur
    fetch(`/api/data/mesai/${userId}`)
        .then(response => response.json())
        .then(apiData => {
            currentPersonApiData = apiData;
            if (apiData.length === 0) {

                gunlukDetayKutusu.innerHTML = 'Bu kişiye ait görüntülenecek mesai verisi bulunamadı.';
                personelInfoKarti.style.display = 'Bu kişiye ait görüntülenecek mesai verisi bulunamadı.';
                anaGrafikAlani.style.display = 'Bu kişiye ait görüntülenecek mesai verisi bulunamadı.';
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

    kisiDetayBaslik.scrollIntoView({ behavior: 'smooth', block: 'center' });

}

/**
 * Verilen verilere göre bar grafiğini oluşturur veya günceller.
 * @param {Object} barData - İşlenmiş bar grafik verileri.
 * @param {Array} apiData - Tıklama olayı için orijinal API verisi.
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
                // === YENİ EKLENEN BÖLÜM: Sadece bu grafik için etiketleri kapat ===
                datalabels: {
                    display: false // Bu satır, bu grafikte etiketlerin görünmesini engeller.
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
                // === YENİ EKLENEN BÖLÜM: DATALABELS AYARLARI ===
                datalabels: {
                    // Formatter fonksiyonu, her bir dilim için ne yazılacağını belirler
                    formatter: (value, context) => {
                        if (total === 0) return '0%'; // Eğer hiç veri yoksa 0% göster
                        // Yüzdeyi hesapla (Örn: (10 / 20 * 100) = 50.0%)
                        const percentage = (value / total * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#ffffff', // Yüzde yazısının rengi
                    font: {
                        weight: 'bold',
                        size: 14,
                    }
                }
            }
        }
    });



}