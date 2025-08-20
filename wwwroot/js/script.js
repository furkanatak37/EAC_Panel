//import { compressIcon, expandIcon } from './icons.js'; 


const personelInfoIcerik = document.getElementById('personel-info-icerik');
const personelListesi = document.getElementById('personelListesi');

const adFiltreInput = document.getElementById('adFiltre');
const firmaFiltre = document.getElementById('firmaFiltre');
const altfirmaFiltre = document.getElementById('altfirmaFiltre');
const departmanFiltre = document.getElementById('departmanFiltre');
//event listener lar
document.addEventListener('DOMContentLoaded', initializePage);
adFiltreInput.addEventListener('input', debounce(applyFilters, 300));
//departmanFiltreSelect.addEventListener('change', applyFilters);
const firmaFiltreSelect = document.getElementById('firmaFiltre');

//buton tanımlamaları

const modalBody = document.getElementById('modal-body-content');
let aktifGrafikVerisi = [];
let guncelGrafikVerisi = []; // YENİ
const kisiDetayBaslik = document.getElementById('kisiDetayBaslik');
const barChartContainer = document.getElementById('barChartContainer');
const donutChartContainer = document.getElementById('donutChartContainer');
const gunlukDetayKutusu = document.getElementById('gunlukDetay');
const gunSeciciSelect = document.getElementById('gunSecici');

firmaFiltreSelect.addEventListener('change', applyFilters);
Chart.register(ChartDataLabels); 

let currentPersonApiData = [];
let mesaiChart = null;
let durumChart = null;
let allPersonnel = [];


const CHART_COLORS = {
    normal: 'rgba(40, 167, 69, 0.7)',
    eksik: 'rgba(220, 53, 69, 0.7)',    // Canlı Kırmızı (Hatalı/Eksik durumlar için)
// Canlı Kırmızı (Hatalı/Eksik durumlar için)
    fazla: 'rgba(13, 110, 253, 0.7)',   // Mavi (Pasta grafikteki fazla mesai için)
   
    // Kenarlıklar için renklerin opak olmayan (tam renk) halleri
    normal_border: 'rgba(40, 167, 69, 1)',
    eksik_border: 'rgba(220, 53, 69, 1)',
    fazla_border: 'rgba(13, 110, 253, 1)',
};

// script.js (Eski createBarChart ve ilgili fonksiyonları silip bunları ekleyin)

// Yeni global değişkenler
const grafikBaslangicInput = document.getElementById('grafikBaslangic');
const grafikBitisInput = document.getElementById('grafikBitis');
const eksikMesaiFiltre = document.getElementById('eksikMesaiFiltre');
const grafikOzetKutusu = document.getElementById('grafik-ozet-kutusu');

/**
 * Gelişmiş Mesai (Gantt) Grafiğini oluşturur ve yönetir.
 */


// script.js dosyanızda bu iki fonksiyonu aşağıdakiyle değiştirin

/**
 * Filtrelere göre veriyi işler, özet kutusunu günceller ve grafiği çizer.
 */

function resetFilters(seviye) {
    if (seviye === 'altfirma' || seviye === 'departman') {
        altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
        altfirmaFiltre.disabled = true;
    }
    if (seviye === 'departman') {
        departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
        departmanFiltre.disabled = true;
    }
}

// === YENİ VE GELİŞTİRİLMİŞ FİLTRE YÖNETİMİ ===

// Bu değişkenin sayfanızda global olarak erişilebilir olduğunu varsayıyoruz.
// let allPersonnel = [ ... verileriniz ... ];

/**
 * Filtreleri başlangıç durumuna getirmek için kullanılır.
 * Sadece en üst seviye olan "Firma" filtresini doldurur, diğerlerini sıfırlar.
 */
function initializeFilters() {
    // 1. Benzersiz firmaları 'allPersonnel' dizisinden al ve sırala
    const firmalar = [...new Map(allPersonnel.map(p => [p.firma, { ad: p.firma }])).values()]
        .map(p => p.ad) // Sadece adları al
        .sort((a, b) => a.localeCompare(b)); // Alfabetik sırala

    // 2. Ana firma filtresini bu verilerle doldur
    populateSelect(firmaFiltre, firmalar, "Firma Seçiniz...");

    // 3. Alt filtreleri temizle ve pasif hale getir
    altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
    altfirmaFiltre.disabled = true;
    departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departmanFiltre.disabled = true;
}

/**
 * Yardımcı Fonksiyon: Bir select elementini dinamik olarak doldurur.
 * @param {HTMLSelectElement} selectElement - Doldurulacak <select> elementi
 * @param {string[]} data - Seçeneklerin listesi (string array)
 * @param {string} defaultText - Varsayılan option metni (örn: "Seçiniz...")
 */
function populateSelect(selectElement, data, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    data.forEach(item => {
        // Olası boşluk sorunlarına karşı trim() kullanmak her zaman iyidir.
        const temizItem = item.trim();
        selectElement.add(new Option(temizItem, temizItem));
    });
}

/**
 * Ana firma filtresi değiştiğinde tetiklenir.
 * İlgili alt firma ve departmanları yeniden doldurur.
 */
function firmaSecildi() {
    const seciliFirma = firmaFiltre.value;

    // Önce alt filtreleri sıfırla
    altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
    altfirmaFiltre.disabled = true;
    departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departmanFiltre.disabled = true;

    if (!seciliFirma) {
        applyFilters(); // Eğer seçim kaldırıldıysa tüm listeyi göster
        return;
    }

    // Seçilen firmaya ait personelleri bul
    const firmaPersonelleri = allPersonnel.filter(p => p.firma === seciliFirma);

    // Alt firmaları doldur ve aktifleştir
    const altFirmalar = [...new Set(firmaPersonelleri.map(p => p.altFirma).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    if (altFirmalar.length > 0) {
        populateSelect(altfirmaFiltre, altFirmalar, "Tüm Alt Firmalar");
        altfirmaFiltre.disabled = false;
    }

    // Departmanları doldur ve aktifleştir
    const departmanlar = [...new Set(firmaPersonelleri.map(p => p.departman).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    if (departmanlar.length > 0) {
        populateSelect(departmanFiltre, departmanlar, "Tüm Departmanlar");
        departmanFiltre.disabled = false;
    }

    // Seçim yapıldığında ana listeyi filtrele
    applyFilters();
}

/**
 * Alt firma filtresi değiştiğinde tetiklenir.
 * Sadece departman filtresini günceller.
 */
function altFirmaSecildi() {
    const seciliFirma = firmaFiltre.value;
    const seciliAltFirma = altfirmaFiltre.value;

    departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
    departmanFiltre.disabled = true;

    if (!seciliFirma) {
        applyFilters();
        return;
    }

    let ilgiliPersoneller = allPersonnel.filter(p => p.firma === seciliFirma);

    // Eğer bir alt firma seçildiyse, personel listesini ona göre de daralt
    if (seciliAltFirma) {
        ilgiliPersoneller = ilgiliPersoneller.filter(p => p.altFirma === seciliAltFirma);
    }

    // Kalan personellere göre departmanları yeniden doldur
    const departmanlar = [...new Set(ilgiliPersoneller.map(p => p.departman).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    if (departmanlar.length > 0) {
        populateSelect(departmanFiltre, departmanlar, "Tüm Departmanlar");
        departmanFiltre.disabled = false;
    }

    // Seçim yapıldığında ana listeyi filtrele
    applyFilters();
}

// BU FONKSİYON AYNI KALIYOR (TRIM() EKLEMESİYLE DAHA SAĞLAM)
// script.js -> applyFilters fonksiyonunu güncelleyin

function applyFilters() {
    // YENİ: Filtreleme başlarken listeyi soluklaştır
    personelListesi.style.opacity = '0.5';

    // Arama işlemini küçük bir gecikmeyle yaparak anlık geri bildirimin görünmesini sağla
    setTimeout(() => {
        const nameFilter = adFiltreInput.value.toLowerCase();
        const firmaFilter = firmaFiltre.value;
        const altFirmaFilter = altfirmaFiltre.value;
        const depFilter = departmanFiltre.value;
        let filteredList = allPersonnel;

        if (firmaFilter) filteredList = filteredList.filter(p => p.firma === firmaFilter);
        if (altFirmaFilter) filteredList = filteredList.filter(p => p.altFirma === altFirmaFilter);
        if (depFilter) filteredList = filteredList.filter(p => p.departman === depFilter);
        if (nameFilter) filteredList = filteredList.filter(p => `${p.ad} ${p.soyad}`.toLowerCase().includes(nameFilter));

        renderPersonnelList(filteredList);

        // YENİ: Filtreleme bitince listeyi tekrar netleştir
        personelListesi.style.opacity = '1';

    }, 50); // 50ms gecikme
}
/**
 * Filtrelere göre veriyi işler, özet kutusunu günceller ve grafiği çizer.
 */















function generateOzetMetni(gec, erken, herIkisi, toplamGoruntulenen) {
    const metinParcalari = [];

    // DÜZELTME: Her bir durumu ayrı ayrı ve net bir şekilde yazdırıyoruz.
    if (herIkisi > 0) {
        metinParcalari.push(`<div class="ozet-oge kirmizi"><strong>${herIkisi}</strong> gün hem geç gelindi hem erken çıkıldı</div>`);
    }
    if (gec > 0) {
        metinParcalari.push(`<div class="ozet-oge kirmizi"><strong>${gec}</strong> gün sadece geç gelindi</div>`);
    }
    if (erken > 0) {
        metinParcalari.push(`<div class="ozet-oge kirmizi"><strong>${erken}</strong> gün sadece erken çıkıldı</div>`);
    }

    if (metinParcalari.length === 0 && toplamGoruntulenen === 0) {
        return `<div class="ozet-oge">Seçili aralıkta görüntülenecek veri yok.</div>`;
    }

    // Toplam görüntülenen gün sayısını en sona ekle
    metinParcalari.push(`<div class="ozet-oge"><strong>${toplamGoruntulenen}</strong> gün görüntülendi</div>`);

    return metinParcalari.join('');
}


function updateChartWithFilters() {
    const baslangic = new Date(grafikBaslangicInput.value);
    const bitis = new Date(grafikBitisInput.value);

    const filtrelenmisVeri = aktifGrafikVerisi.filter(d => {
        const tarih = new Date(d.Tarih || d.tarih);
        return tarih >= baslangic && tarih <= bitis;
    });

    const eksikFiltrele = !eksikMesaiFiltre.checked;
    let eksikMesaiSayisi = 0;

    const labels = [];
    const chartData = [];
    const backgroundColors = [];
    let enGecCikisSaati = 18;
    let enErken = 8;

    filtrelenmisVeri.forEach(d => {
        const ilkGiris = new Date(d.IlkGiris || d.ilkGiris);
        const sonCikis = new Date(d.SonCikis || d.sonCikis);
        const toplamMesai = d.ToplamMesaiDakika || d.toplamMesaiDakika || 0;

        // DÜZELTME 1: Renkler artık 8 saat (480 dk) kuralına göre belirleniyor
        const isCalismaSuresiEksik = toplamMesai < 480;

        if (isCalismaSuresiEksik) {
            eksikMesaiSayisi++;
        }

        labels.push(new Date(d.Tarih || d.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }));
        backgroundColors.push(isCalismaSuresiEksik ? CHART_COLORS.eksik : CHART_COLORS.normal);

        let gunVerisi = [ilkGiris.getHours() + ilkGiris.getMinutes() / 60, sonCikis.getHours() + sonCikis.getMinutes() / 60];
        if (!eksikFiltrele && !isCalismaSuresiEksik) {
            gunVerisi = null;
        }
        chartData.push(gunVerisi);

        // DÜZELTME 2: En geç çıkış saatini bul
        const cikisSaatiDecimal = sonCikis.getHours() + sonCikis.getMinutes() / 60;
        if (cikisSaatiDecimal > enGecCikisSaati) {
            enGecCikisSaati = cikisSaatiDecimal;
        }


        const girisSaatiDecimal = ilkGiris.getHours() + ilkGiris.getMinutes() / 60;
        if (girisSaatiDecimal < enErken) {
            enErken = girisSaatiDecimal;
        }


    });
    guncelGrafikVerisi = filtrelenmisVeri.filter(d => {
        const toplamMesai = d.ToplamMesaiDakika || d.toplamMesaiDakika || 0;
        const isCalismaSuresiEksik = toplamMesai < 480;

        // Eğer "Eksik Mesai" filtresi seçili DEĞİLSE ve bu gün eksik bir gün İSE,
        // bu kaydı listeye dahil ETME (false döndür).
        if (eksikFiltrele && isCalismaSuresiEksik) {
            return false;
        }
        // Diğer tüm durumlarda kaydı listede tut (true döndür).
        return true;
    });
    grafikOzetKutusu.innerHTML = `
        <div class="ozet-oge kirmizi"><strong>${eksikMesaiSayisi}</strong> gün eksik mesai yapıldı</div>
        <div class="ozet-oge"><strong>${labels.length}</strong> gün görüntülendi</div>
    `;

    // Grafiği çiz ve dinamik Y ekseni için en geç çıkış saatini gönder
    drawGanttChart(labels, chartData, backgroundColors, enGecCikisSaati, enErken);
}
function createAdvancedBarChart(apiData) {
    aktifGrafikVerisi = apiData; // Veriyi global değişkene ata
    const excelButonu = document.getElementById('grafik-excel-btn');
    excelButonu.addEventListener('click', exportChartDataToExcel);
    // Tarih aralığı seçicilerini ayarla
    // Varsayılan olarak son 30 günü göster
    const bitisTarihi = new Date();
    const baslangicTarihi = new Date();
    baslangicTarihi.setDate(bitisTarihi.getDate() - 30);

    grafikBaslangicInput.value = baslangicTarihi.toISOString().split('T')[0];
    grafikBitisInput.value = bitisTarihi.toISOString().split('T')[0];

    // Filtreleme kontrollerine olay dinleyicileri ata
    grafikBaslangicInput.addEventListener('change', updateChartWithFilters);
    grafikBitisInput.addEventListener('change', updateChartWithFilters);
    eksikMesaiFiltre.addEventListener('change', updateChartWithFilters);


    // Grafiği ilk kez çiz
    updateChartWithFilters();
}
function drawGanttChart(labels, chartData, backgroundColors, enGecCikis,enErken) {
    if (mesaiChart) {
        mesaiChart.destroy();
    }
    const ctx = document.getElementById('mesaiChart').getContext('2d');

    // Y ekseninin bitişini hesapla: En geç çıkış saatini bir sonraki saate yuvarla.
    // Ama en az 18:00 olsun ki grafik çok sıkışmasın.
    const yAxisMax = Math.max(18, Math.ceil(enGecCikis));
    const yAxisMin = Math.min(8, Math.ceil(enErken));
    console.log(enErken);
    mesaiChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Çalışma Aralığı',
                data: chartData,
                backgroundColor: backgroundColors,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Tarih' } },
                y: {
                    min: yAxisMin,    // Başlangıç 08:30 (sabit)
                    max: yAxisMax, // Bitiş (dinamik)
                    ticks: {
                        stepSize: 1, // Saatleri birer birer göstermesi için
                        callback: function (value) {
                            if (Math.floor(value) === value) { // Sadece tam saatleri yaz
                                return value.toString().padStart(2, '0') + ':00';
                            }
                        }
                    },
                    title: { display: true, text: 'Saat' }
                }
            },
            plugins: {
                legend: {
                    display: false // Bu satır, üstteki "Çalışma Aralığı" etiketini kaldırır
                },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        // drawGanttChart fonksiyonu içinde, options -> plugins -> tooltip -> callbacks -> label

                        label: function (context) {
                            const val = context.raw;
                            if (!val) return ''; // Eğer veri null ise tooltip gösterme

                            const formatla = (saat) => {
                                const h = Math.floor(saat);
                                const m = Math.round((saat - h) * 60);
                                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            };

                            // === YENİ HESAPLAMA KISMI ===

                            // 1. Toplam süreyi ondalık saat olarak hesapla (örn: 8.5)
                            const sureDecimal = val[1] - val[0];

                            // 2. Ondalık saati, tam saat ve dakikaya ayır
                            const sureSaat = Math.floor(sureDecimal);
                            const sureDakika = Math.round((sureDecimal - sureSaat) * 60);

                            // 3. Gösterilecek metni oluştur ("8 saat 30 dakika" gibi)
                            let calisilanSureMetni = '';
                            if (sureSaat > 0) {
                                calisilanSureMetni += `${sureSaat} saat `;
                            }
                            if (sureDakika > 0) {
                                calisilanSureMetni += `${sureDakika} dakika`;
                            }
                            calisilanSureMetni = calisilanSureMetni.trim();
                            if (calisilanSureMetni === '') {
                                calisilanSureMetni = '0 dakika';
                            }
                            // === HESAPLAMA BİTTİ ===

                            // Tooltip'in son halini birleştir (Array kullanarak çok satırlı yapıyoruz)
                            return [
                                `Çalışılan Süre: ${calisilanSureMetni}`,
                                ``, // Boş bir satır ekleyerek ayırıcı oluştur
                                `Giriş: ${formatla(val[0])}`,
                                `Çıkış: ${formatla(val[1])}`
                            ];
                        
                        }
                    }
                },
                annotation: {
                    annotations: {
                        mesaiBaslangic: {
                            type: 'line',
                            // 'yValue' yerine 'yMin' ve 'yMax' kullanarak çizginin
                            // kesinlikle yatay olmasını sağlıyoruz.
                            yMin: 8.5,
                            yMax: 8.5,
                            borderColor: 'rgba(75, 192, 192, 0.8)',
                            borderWidth: 2, // Çizgiyi biraz kalınlaştıralım
                            borderDash: [6, 6],
                            label: {
                                content: 'Mesai Başlangıcı (8:30)',
                                display: true,
                                position: 'end', // Etiketi sağa alalım
                                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                                color: 'white',
                                font: { weight: 'bold' }
                            }
                        },
                        mesaiBitis: {
                            type: 'line',
                            // 'yValue' yerine 'yMin' ve 'yMax' kullanıyoruz.
                            yMin: 17.5,
                            yMax: 17.5, // 17.5 = 17:30
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: 'Mesai Bitişi (17:30)',
                                display: true,
                                position: 'end', // Etiketi sağa alalım
                                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                                color: 'white',
                                font: { weight: 'bold' }
                            }
                        }
                    }
                }
            ,
            }
        }
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


    personelleriGetir();

}



function personelleriGetir() {
    fetch('/api/data/personeller')
        .then(response => response.json())
        .then(data => {
            allPersonnel = data.map(p => ({
                ...p,
                ad: p.ad || p.Ad,
                soyad: p.soyad || p.Soyad,
                departman: p.departman || p.Departman,
                firma: p.firma || p.Firma,
                altFirma: p.altFirma || p.AltFirma
            }));
            populateInitialFilters();
            applyFilters();


            const params = new URLSearchParams(window.location.search);
            const userIdFromUrl = params.get('UserID');


     

            if (userIdFromUrl) {
                // Not: UserID'ler string veya number olabilir, gevşek karşılaştırma (==) kullanalım.
                const person = allPersonnel.find(p => (p.userID || p.UserID) == userIdFromUrl);
                const listItem = personelListesi.querySelector(`li[data-userid='${userIdFromUrl}']`);

                if (person && listItem) {
                    // Eğer personel ve liste elemanı bulunduysa, kisiSecildi fonksiyonunu otomatik olarak çağır
                    console.log(`URL'den gelen ${userIdFromUrl} ID'li kişi otomatik seçiliyor...`);
                    kisiSecildi(person.userID || person.UserID, `${person.ad} ${person.soyad}`, listItem);
                } else {
                    console.warn(`URL'de belirtilen UserID (${userIdFromUrl}) personel listesinde bulunamadı.`);
                }
            }
        })
        .catch(error => {
            console.error('Personel listesi alınırken hata:', error);
        });
}

// --- Olay Dinleyicileri ---
adFiltreInput.addEventListener('input', applyFilters);
departmanFiltre.addEventListener('change', applyFilters);
firmaFiltre.addEventListener('change', firmaSecildi);
altfirmaFiltre.addEventListener('change', altFirmaSecildi);
//filtreTemizleBtn.addEventListener('click', clearFilters);

// --- Uygulamayı Başlat ---
personelleriGetir();



function clearFilters() {
    adFiltreInput.value = '';
    firmaFiltre.selectedIndex = 0;
    firmaFiltre.dispatchEvent(new Event('change'));
}

function populateInitialFilters() {
    const firmalar = [...new Set(allPersonnel.map(p => p.firma).filter(Boolean))];
    firmalar.sort();
    firmalar.forEach(firma => firmaFiltre.add(new Option(firma, firma)));
}

// script.js dosyanızdaki bu fonksiyonu güncelleyin

/**
 * API'den gelen veriye göre firma filtresi dropdown'ını doldurur.
 */
function populateFirmaFilter() {
    // API'den gelen yanıttaki 'Firma' anahtarını küçük harfe çevirdiğimiz için 'firma' olarak okuyoruz.
    const firmalar = [...new Set(allPersonnel.map(p => p.firma).filter(Boolean))];
    firmalar.sort();

    firmaFiltreSelect.innerHTML = '<option value="">Tüm Firmalar</option>';
    firmalar.forEach(firma => {
        const option = document.createElement('option');
        option.value = firma;
        option.textContent = firma;
        firmaFiltreSelect.appendChild(option);
    });
}
function applyFilters() {
    const nameFilter = adFiltreInput.value.toLowerCase();
    const firmaFilter = firmaFiltre.value;
    const altFirmaFilter = altfirmaFiltre.value;
    const depFilter = departmanFiltre.value;

    let filteredList = allPersonnel;

    if (firmaFilter) filteredList = filteredList.filter(p => p.firma === firmaFilter);
    if (altFirmaFilter) filteredList = filteredList.filter(p => p.altFirma === altFirmaFilter);
    if (depFilter) filteredList = filteredList.filter(p => p.departman === depFilter);
    if (nameFilter) {
        // DÜZELTME: Veri de aynı şekilde Türkçe'ye özel olarak küçük harfe çevrildi.
        filteredList = filteredList.filter(p =>
            `${p.ad} ${p.soyad}`.toLocaleLowerCase('tr-TR').includes(nameFilter)
        );
    }

    renderPersonnelList(filteredList);
}

//gunSeciciSelect.addEventListener('change', handleGunSeciciChange);
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
        li.dataset.userid = userId;

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

// script.js dosyanızdaki bu fonksiyonu değiştirin

// script.js dosyanızdaki bu fonksiyonu değiştirin



async function fetchAndDisplayPersonelInfo(userId) {
    personelInfoIcerik.innerHTML = '<i>Bilgiler yükleniyor...</i>';
    try {
        const response = await fetch(`/api/data/getinfo/${userId}`);
        if (!response.ok) throw new Error('Personel bilgileri API\'den alınamadı.');

        // DÜZELTME: Gelen JSON'da tek bir eleman olduğu için ilkini ([0]) alıyoruz.
        const infoDataArray = await response.json();
        if (!infoDataArray || infoDataArray.length === 0) throw new Error("Personel bilgisi boş geldi.");
        const infoData = infoDataArray[0];

        const personelNo = parseInt(infoData.personleNo) || 'N/A';

        const giris = infoData.giris?.substring(0, 10);

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
            <p><strong>Personel No:</strong> ${personelNo}</p>
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
   // gunlukDetayKutusu.innerHTML = 'Veriler yükleniyor...';

    kisiDetayBaslik.style.display = 'block';
   // gunlukDetayKutusu.style.display = 'block';
    personelInfoKarti.style.display = 'flex';
   // anaGrafikAlani.style.display = 'flex';

    if (mesaiChart) mesaiChart.destroy();
    if (durumChart) durumChart.destroy();
   // gunSeciciSelect.innerHTML = '<option value="">Yükleniyor...</option>';


    fetch(`/api/data/mesai/${userId}`)
        .then(response => response.json())
        .then(apiData => {
            currentPersonApiData = apiData;
            if (apiData.length === 0) {


                chartsSectionContainer.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!'; 
                personelInfoKarti.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
             //   anaGrafikAlani.style.display = '!! Bu kişiye ait görüntülenecek mesai verisi bulunamadı. !!';
                return;
            }

            barChartContainer.style.display = 'block';
            donutChartContainer.style.display = 'block';

            const processedData = processChartData(apiData);
            
            createAdvancedBarChart(apiData); // Yeni Gantt grafiğini başlatır
            createDoughnutChart(processChartData(apiData).donutData); // Pasta grafik aynı kalabilir

        })
        .catch(error => {
            console.error('Mesai detayı alınırken hata:', error);
           // gunlukDetayKutusu.innerHTML = 'Mesai verileri yüklenirken bir hata oluştu.';
        });




    
    kisiDetayBaslik.scrollIntoView({ behavior: 'smooth', block: 'center' });

}

/**
 * @param {Object} barData
 * @param {Array} apiData 
 */


// script.js dosyanızdaki bu fonksiyonu da değiştirin

// script.js dosyanızdaki bu fonksiyonu da değiştirin




function processChartData(apiData) {
    const barData = { tarihler: [], mesaiDakika: [], backgroundColors: [], borderColors: [] };
    // DÜZELTME: 'donutData' artık üç kategoriyi sayacak.
    const donutData = { tam_mesai: 0, sadece_eksik: 0 };

    apiData.forEach(gunlukVeri => {
        const tarih = new Date(gunlukVeri.Tarih || gunlukVeri.tarih);
        if (isNaN(tarih.getTime())) return;

        const ilkGiris = new Date(gunlukVeri.IlkGiris || gunlukVeri.ilkGiris);
        const sonCikis = new Date(gunlukVeri.SonCikis || gunlukVeri.sonCikis);

        const isGec = ilkGiris > new Date(tarih).setHours(9, 0, 0);
        const isErken = sonCikis < new Date(tarih).setHours(17, 0, 0);

        // Bar grafik verileri aynı kalabilir...
        barData.tarihler.push(tarih.toLocaleDateString('tr-TR'));
        barData.mesaiDakika.push(gunlukVeri.ToplamMesaiDakika || gunlukVeri.toplamMesaiDakika);
        barData.borderColors.push((isGec || isErken) ? CHART_COLORS.eksik_border : CHART_COLORS.normal_border);

        const toplamMesai = gunlukVeri.ToplamMesaiDakika || gunlukVeri.toplamMesaiDakika || 0;

        // DÜZELTME 1: Renkler artık 8 saat (480 dk) kuralına göre belirleniyor
        const isCalismaSuresiEksik = toplamMesai < 480;

        if (isCalismaSuresiEksik) {
            donutData.sadece_eksik++;
            
        } else {
            donutData.tam_mesai++;
        } 
    });
    return { barData, donutData };
}
function createDoughnutChart(donutData) {
    donutChartContainer.style.display = 'flex';
    const ctx = document.getElementById('durumChart').getContext('2d');

    // DÜZELTME: Veri artık 3 bölümden oluşuyor.
    const dataValues = [donutData.tam_mesai, donutData.sadece_eksik];
    const total = dataValues.reduce((acc, val) => acc + val, 0);

    // Yeni renkler tanımlayalım
    const hemEksikColor = 'rgba(255, 159, 64, 0.7)'; // Turuncu gibi bir ara renk

    durumChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            // DÜZELTME: Etiketler 3'e çıkarıldı.
            labels: ['Tam Mesai Günü', 'Sadece Eksik Mesai'],
            datasets: [{
                data: dataValues,
                // DÜZELTME: Renkler 3'e çıkarıldı.
                backgroundColor: [CHART_COLORS.normal, CHART_COLORS.eksik],
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
                        if (total === 0 || value === 0) return ''; // 0% olanları gösterme
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


// =================================================================================
// RAPORLAR AÇILIR MENÜ MANTIĞI
// =================================================================================
const raporlarBtn = document.getElementById('raporlar-btn');
const raporlarDropdown = document.getElementById('raporlar-dropdown-icerik');

raporlarBtn.addEventListener('click', () => {
    // Menüyü aç/kapat
    raporlarDropdown.classList.toggle('show');
});

// Menü dışına tıklandığında menüyü kapat
window.addEventListener('click', (event) => {
    // Eğer tıklanan yer buton değilse...
    if (!event.target.matches('#raporlar-btn, #raporlar-btn *')) {
        // ...ve eğer menü açıksa, menüyü kapat.
        if (raporlarDropdown.classList.contains('show')) {
            raporlarDropdown.classList.remove('show');
        }
    }
});






// script.js dosyasının en altına, diğer fonksiyonların yanına ekleyin

/**
 * Bir fonksiyonun belirli bir süre içinde tekrar tekrar çalışmasını engeller (Debounce).
 * @param {Function} func - Çalıştırılacak fonksiyon.
 * @param {number} delay - Bekleme süresi (milisaniye).
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Kişiye özel grafik verilerini formatlayıp Excel dosyası olarak indirir.
 */
// script.js dosyanızdaki bu fonksiyonu değiştirin

/**
 * Kişiye özel grafik verilerini formatlayıp, iki sekmeli (Tüm Günler ve Eksik Mesailer)
 * bir Excel dosyası olarak indirir.
 */
/**
 * Kişiye özel grafik verilerini ExcelJS kullanarak formatlar ve renkli bir şekilde indirir.
 */
async function exportChartDataToExcel() {
    if (!guncelGrafikVerisi || guncelGrafikVerisi.length === 0) {
        alert("Aktarılacak veri bulunamadı.");
        return;
    }

    // 1. Gerekli Bilgileri Topla
    const adSoyad = document.getElementById('kisiDetayBaslik').textContent.replace(' - Mesai Detayları', '');
    const baslangic = document.getElementById('grafikBaslangic').value;
    const bitis = document.getElementById('grafikBitis').value;

    // YENİ: İlk veri satırından ek bilgileri al
    const ilkKayit = guncelGrafikVerisi[0];
    const sicilId = ilkKayit.SicilID || ilkKayit.sicilID || 'N/A';
    const personelNo = ilkKayit.PersonelNo || ilkKayit.personelNo || 'N/A';
    const cardId = ilkKayit.CardID || ilkKayit.cardID || 'N/A';
    const userId = ilkKayit.UserID || ilkKayit.userID || 'N/A';


    // 2. Yeni Bir Excel Çalışma Kitabı Oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mesai Detay Raporu');

    // 3. Başlık Bilgilerini Ekle ve Stillendir
    // DÜZELTME: Başlığa yeni bilgiler eklendi
    worksheet.addRow(["Personel Adı:", adSoyad]);
    worksheet.addRow(["Personel No:", personelNo, "", "Sicil ID:", sicilId]);
    worksheet.addRow(["UserID:", userId, "", "Card ID:", cardId]);
    worksheet.addRow(["Rapor Tarih Aralığı:", `${baslangic} - ${bitis}`]);
    worksheet.addRow([]); // Boş satır

    // Hücreleri birleştir ve stil ver
    worksheet.mergeCells('B1:E1');
    worksheet.mergeCells('B2:C2'); worksheet.mergeCells('E2:F2');
    worksheet.mergeCells('B3:C3'); worksheet.mergeCells('E3:F3');
    worksheet.mergeCells('B4:E4');

    [1, 2, 3, 4].forEach(i => {
        worksheet.getRow(i).font = { bold: true, size: 12 };
    });
    // 4. Sütun Başlıklarını Ekle ve Stillendir
    const sutunBasliklari = ['Tarih', 'İlk Giriş', 'Son Çıkış', 'Toplam Süre', 'Durum'];
    const headerRow = worksheet.addRow(sutunBasliklari);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF495057' } // Koyu Gri
        };
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
        };
    });

    // 5. Veri Satırlarını Ekle ve Koşullu Renklendir
    guncelGrafikVerisi.forEach(d => {
        const tarih = new Date(d.Tarih || d.tarih);
        const ilkGiris = new Date(d.IlkGiris || d.ilkGiris);
        const sonCikis = new Date(d.SonCikis || d.sonCikis);
        const toplamMesai = d.ToplamMesaiDakika || d.toplamMesaiDakika || 0;

        const isEksik = toplamMesai < 480;
        const saat = Math.floor(toplamMesai / 60);
        const dakika = toplamMesai % 60;

        const rowData = [
            tarih.toLocaleDateString('tr-TR'),
            ilkGiris.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            sonCikis.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            `${saat} saat ${dakika} dk`,
            isEksik ? 'Eksik Mesai' : 'Tamamlandı'
        ];

        const row = worksheet.addRow(rowData);

        // EĞER GÜN EKSİK MESAİ İSE, SATIRI KIRMIZIYA BOYA
        if (isEksik) {
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFEBEE' } // Çok açık kırmızı
                };
                cell.font = {
                    color: { argb: 'FF9C0006' } // Koyu kırmızı yazı
                }
            });
        }
    });

    // 6. Sütun Genişliklerini Ayarla
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 15;

    // 7. Dosyayı Oluştur ve İndir
    workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer]), `${adSoyad} Mesai Raporu.xlsx`);
    });
}










