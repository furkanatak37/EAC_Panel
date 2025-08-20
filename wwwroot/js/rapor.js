document.addEventListener('DOMContentLoaded', () => {
    // === Element Referansları ===
    const tabloBaslik = document.getElementById('rapor-tablo-baslik');
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const raporBaslik = document.getElementById('rapor-baslik');
    const excelBtn = document.getElementById('excel-aktar-btn');
    const pdfBtn = document.getElementById('pdf-kaydet-btn');

    const baslangicTarihInput = document.getElementById('baslangicTarih');
    const bitisTarihInput = document.getElementById('bitisTarih');
    const raporOlusturBtn = document.getElementById('raporOlusturBtn');

    const departmanFiltre = document.getElementById('departmanFiltre');
    const firmaFiltre = document.getElementById('firmaFiltre');
    const altfirmaFiltre = document.getElementById('altfirmaFiltre');
    const filtreTemizleBtn = document.getElementById('rapor-filtre-temizle-btn');
    const kayitSayaci = document.getElementById('rapor-kayit-sayaci');


    let personelFiltreHaritasi = []; // Tüm personel ilişkilerini tutacak

    // === URL'den Gelen Parametreleri Oku ===
    const params = new URLSearchParams(window.location.search);
    const raporTuru = params.get('rapor');

    // === Olay Dinleyicileri ===
    raporOlusturBtn.addEventListener('click', raporOlustur);
    excelBtn.addEventListener('click', exportTableToExcel);
    pdfBtn.addEventListener('click', exportPageToPdf);
    firmaFiltre.addEventListener('change', firmaSecildi);
    altfirmaFiltre.addEventListener('change', altFirmaSecildi);
    filtreTemizleBtn.addEventListener('click', clearReportFilters); // YENİ

    /**
     * Filtre dropdown menülerini API'den gelen veriyle doldurur.
     */
    async function populateFilters() {
        try {
            const response = await fetch('/api/data/filtre-verileri');
            if (!response.ok) throw new Error("Filtre verileri alınamadı.");
            const data = await response.json();

            data.departmanlar.forEach(item => departmanFiltre.add(new Option(item.ad, item.id)));
            data.firmalar.forEach(item => firmaFiltre.add(new Option(item.ad, item.id)));
            data.altFirmalar.forEach(item => altfirmaFiltre.add(new Option(item.ad, item.id)));
        } catch (error) {
            console.error("Filtreler doldurulurken hata:", error);
        }
    }


    function updateRowCount() {
        const placeholder = tabloGovdesi.querySelector('td[colspan]');
        if (placeholder) {
            kayitSayaci.textContent = '0 kayıt listelendi.';
            return;
        }
        const rowCount = tabloGovdesi.querySelectorAll('tr').length;
        kayitSayaci.textContent = `${rowCount} kayıt listelendi.`;
    }
    function firmaSecildi() {
        const seciliFirmaId = parseInt(firmaFiltre.value);

        // Önce alt filtreleri sıfırla ve pasif yap
        altfirmaFiltre.innerHTML = '<option value="">Tüm Alt Firmalar</option>';
        altfirmaFiltre.disabled = true;
        departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';
        departmanFiltre.disabled = true;

        if (!seciliFirmaId) return;

        // Seçilen firmadaki personelleri bul
        const firmaPersonelleri = personelFiltreHaritasi.filter(p => p.firmaId === seciliFirmaId);

        // Alt firmaları doldur ve aktifleştir
        const altFirmalar = [...new Map(firmaPersonelleri.map(p => [p.altFirmaId, { ID: p.altFirmaId, Ad: p.altFirmaAdi }])).values()];
        if (altFirmalar.length > 1 || (altFirmalar.length === 1 && altFirmalar[0].ID)) { // Birden çok alt firma varsa veya tek ve geçerli bir alt firma varsa
            populateSelect(altfirmaFiltre, altFirmalar.sort((a, b) => a.Ad.localeCompare(b.Ad)), "Tüm Alt Firmalar");
            altfirmaFiltre.disabled = false;
        }

        // Departmanları doldur ve aktifleştir
        const departmanlar = [...new Map(firmaPersonelleri.map(p => [p.departmanId, { ID: p.departmanId, Ad: p.departmanAdi }])).values()];
        if (departmanlar.length > 0) {
            populateSelect(departmanFiltre, departmanlar.sort((a, b) => a.Ad.localeCompare(b.Ad)), "Tüm Departmanlar");
            departmanFiltre.disabled = false;
        }
    }
    function altFirmaSecildi() {
        const seciliFirmaId = parseInt(firmaFiltre.value);
        const seciliAltFirmaId = parseInt(altfirmaFiltre.value);

        departmanFiltre.innerHTML = '<option value="">Tüm Departmanlar</option>';

        if (!seciliFirmaId) return;

        let ilgiliPersoneller = personelFiltreHaritasi.filter(p => p.firmaId === seciliFirmaId);
        if (seciliAltFirmaId) { // Eğer bir alt firma seçildiyse, ona göre de filtrele
            ilgiliPersoneller = ilgiliPersoneller.filter(p => p.altFirmaId === seciliAltFirmaId);
        }

        // Departmanları yeniden doldur
        const departmanlar = [...new Map(ilgiliPersoneller.map(p => [p.departmanId, { ID: p.departmanId, Ad: p.departmanAdi }])).values()];
        populateSelect(departmanFiltre, departmanlar.sort((a, b) => a.Ad.localeCompare(b.Ad)), "Tüm Departmanlar");
        departmanFiltre.disabled = false;
    }

    async function initializeFilters() {
        try {
            // Backend'den tüm personel/firma/departman ilişkilerini tek seferde çek
            const response = await fetch('/api/data/filtre-haritasi');
            personelFiltreHaritasi = await response.json();

            // Sadece ana firma filtresini doldur
            const firmalar = [...new Map(personelFiltreHaritasi.map(p => [p.firmaId, { ID: p.firmaId, Ad: p.firmaAdi }])).values()];
            populateSelect(firmaFiltre, firmalar.sort((a, b) => a.Ad.localeCompare(b.Ad)), "Firma Seçin...");

        } catch (error) {
            console.error("Filtre haritası alınamadı:", error);
        }
    }
    function populateSelect(selectElement, data, defaultText) {
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;
        data.forEach(item => {
            selectElement.add(new Option(item.Ad, item.ID));
        });
    }
    /**
     * "Raporla" butonuna tıklandığında veya sayfa ilk yüklendiğinde çalışır.
     */

    const durumFiltre = document.getElementById('durumFiltre');

    function raporOlustur() {
        const baslangic = baslangicTarihInput.value;
        const bitis = bitisTarihInput.value;
        const depId = departmanFiltre.value;
        const firmaId = firmaFiltre.value;
        const altFirmaId = altfirmaFiltre.value;
        const durum = durumFiltre.value; // Yeni filtrenin değerini oku

        if (!baslangic || !bitis || !raporTuru) {
            alert("Geçerli bir rapor türü veya tarih aralığı bulunamadı.");
            return;
        }

        tabloGovdesi.innerHTML = '<tr><td colspan="5">Yükleniyor...</td></tr>';

        let apiUrl;
        if (raporTuru === 'eksik-mesai-yeni') { // YENİ API ÇAĞRISI
            apiUrl = `/api/data/eksik-mesai-ve-devamsizlik-raporu?baslangic=${baslangic}&bitis=${bitis}`;
        }
        else if (raporTuru === 'departman') {
            apiUrl = `/api/data/aralik-raporu?baslangic=${baslangic}&bitis=${bitis}`;
        } else if (raporTuru === 'devamsizlik') {
            apiUrl = `/api/data/getGelmeyenlerDetay?baslangic=${baslangic}&bitis=${bitis}`;
        }
        else if (raporTuru === 'izinliler') { // YENİ API ÇAĞRISI
            apiUrl = `/api/data/getIzinliler?baslangic=${baslangic}&bitis=${bitis}`;
        }
        

        else {
            apiUrl = `/api/data/aralik-detaylari?baslangic=${baslangic}&bitis=${bitis}`;
        }

        if (depId) apiUrl += `&departmanId=${depId}`;
        if (firmaId) apiUrl += `&firmaId=${firmaId}`;
        if (altFirmaId) apiUrl += `&altFirmaId=${altFirmaId}`;
        if (durum) apiUrl += `&durumFiltresi=${durum}`; // Yeni durumu URL'e ekle

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (raporTuru === 'gec') {
                    renderGecGelenlerRaporu(data, baslangic, bitis);
                } else if (raporTuru === 'mesai') {
                    renderFazlaMesaiRaporu(data, baslangic, bitis);
                } else if (raporTuru === 'erken') {
                    renderErkenCikanlarRaporu(data, baslangic, bitis);
                } else if (raporTuru === 'departman') {
                    renderDepartmanRaporu(data.departmanOzetleri, baslangic, bitis);
                } else if (raporTuru === 'devamsizlik') {
                    renderDevamsizlikRaporu(data, baslangic, bitis);
                }
                else if (raporTuru === 'izinliler') {
                    renderIzinlilerRaporu(data, baslangic, bitis);
                }
                 else if (raporTuru === 'eksik-mesai-yeni') { // YENİ RENDER ÇAĞRISI
                    renderEksikMesaiRaporu(data, baslangic, bitis);
                }
                updateRowCount();

            })
            .catch(error => {
                console.error('Rapor oluşturulurken hata:', error);
                tabloGovdesi.innerHTML = '<tr><td colspan="5">Rapor oluşturulurken bir hata oluştu.</td></tr>';
                updateRowCount(); // Hata durumunda da sayacı sıfırla

            });
    }



    function clearReportFilters() {
        // Ana firma filtresini sıfırla
        firmaFiltre.selectedIndex = 0;
        // Bu, zincirleme olarak diğer filtreleri de sıfırlayacak olan 'change' olayını tetikler.
        firmaFiltre.dispatchEvent(new Event('change'));
        // Tabloyu ve sayacı başlangıç durumuna getir
        setInitialReportState(raporTuru);
        kayitSayaci.textContent = '';
    }

    /**
     * Sayfa ilk açıldığında rapor türüne göre başlığı ve boş tabloyu ayarlar.
     */
    function setInitialReportState(raporTuru) {
        let baslik = "Detaylı Rapor";
        let ustMenuHtml = '<tr><th>Veri</th></tr>'; // Varsayılan
        let colspan = 5;
        if (raporTuru === 'eksik-mesai-yeni') {
            baslik = "Eksik Mesai ve Devamsızlık Raporu";
            ustMenuHtml = `<tr><th>Tarih</th><th>UserID</th><th>Ad Soyad</th><th>Departman</th><th>Firma</th><th>Alt Firma</th><th>Toplam Süre</th><th>Durum</th></tr>`;
            colspan = 8;
            durumFiltre.style.display = 'inline-block'; // Durum filtresini görünür yap
        }
        else if (raporTuru === 'gec') {
            baslik = "Geç Gelenler Raporu";
            ustMenuHtml = '<tr><th>Tarih</th><th>Ad Soyad</th><th>Departman</th><th>Giriş Saati</th><th>Gecikme Süresi</th></tr>';
        } else if (raporTuru === 'erken') {
            baslik = "Erken Çıkanlar Raporu";
            ustMenuHtml = '<tr><th>Tarih</th><th>Ad Soyad</th><th>Departman</th><th>Çıkış Saati</th><th>Erken Çıkış Süresi</th></tr>';
        } else if (raporTuru === 'mesai') {
            baslik = "Fazla Mesai Raporu";
            ustMenuHtml = '<tr><th>Tarih</th><th>Ad Soyad</th><th>Departman</th><th>Çıkış Saati</th><th>Fazla Mesai Süresi</th></tr>';
        } else if (raporTuru === 'devamsizlik') {
            baslik = "Devamsızlık Raporu";
            ustMenuHtml = '<tr><th>Tarih</th><th>Ad Soyad</th><th>Departman</th><th>İletişim</th></tr>';
            colspan = 4;
        } else if (raporTuru === 'departman') {
            baslik = "Departman Analiz Raporu";
            ustMenuHtml = '<tr><th>Departman</th><th>Kişi Sayısı</th><th>Ortalama Giriş Saati</th><th>Ortalama Çıkış Saati</th></tr>';
            colspan = 4;
        }



        raporBaslik.textContent = baslik;
        tabloBaslik.innerHTML = ustMenuHtml;
        tabloGovdesi.innerHTML = `<tr><td colspan="${colspan}">Raporu görüntülemek için tarih aralığı seçip butona basın.</td></tr>`;
    }

    /**
     * Sayfanın ilk açılışını yönetir.
     */
    async function initializeReportPage() {
        baslangicTarihInput.value = params.get('baslangic');
        bitisTarihInput.value = params.get('bitis');

        setInitialReportState(raporTuru); // Önce başlıkları ve boş tabloyu ayarla
        await populateFilters(); // Sonra filtre seçeneklerini doldur
        // İlk raporu otomatik oluşturmak isterseniz aşağıdaki satırı aktif edebilirsiniz.
        // raporOlustur(); 
    }

    // Uygulamayı Başlat
    initializeReportPage();
    initializeFilters();
});


/**
 * Devamsızlık raporunu tabloya çizer.
 */
function renderDevamsizlikRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Devamsızlık Raporu (${formatliBaslangic} - ${formatliBitis})`;

    // DÜZELTME: "Pozisyon" başlığı eklendi
    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Ad Soyad</th>
            <th>Pozisyon</th>
            <th>Departman</th>
            <th>İletişim</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    tabloGovdesi.innerHTML = '';

    if (!data || data.length === 0) {
        // DÜZELTME: Colspan 5 olarak güncellendi
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Bu aralıkta devamsızlık yapan personel bulunamadı.</td></tr>';
        return;
    }

    // Okunabilirlik için veriyi tarihe göre sıralayalım
    data.sort((a, b) => new Date(a.tarih || a.Tarih) - new Date(b.tarih || b.Tarih));

    data.forEach(p => {
        const tr = document.createElement('tr');

        // YENİ: İletişim ikonlarını oluşturma mantığı
        const email = p.email || p.Email;
        const tel = p.tel || p.cepTelefon; // Backend'den 'CepTelefon' olarak geliyor olabilir
        let iletisimHtml = '';
        if (email && String(email).trim() !== '') {
            iletisimHtml += `
                <a href="mailto:${email}" class="icon-link" title="${email}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg>
                </a>`;
        }
        if (tel && String(tel).trim() !== '') {
            iletisimHtml += `
                <a href="tel:${tel}" class="icon-link" title="${tel}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.938 17.938 0 0 0 4.154 6.608 17.938 17.938 0 0 0 6.608 4.154c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>
                </a>`;
        }

        // DÜZELTME: innerHTML 5 sütun içerecek şekilde güncellendi
        tr.innerHTML = `
            <td>${new Date(p.tarih || p.Tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.ad || p.Ad} ${p.soyad || p.Soyad}</td>
            <td>${p.pozisyon || p.Pozisyon || 'N/A'}</td>
            <td>${p.departman || p.Departman || 'N/A'}</td>
            <td class="iletisim-ikonlari">${iletisimHtml || 'N/A'} ${tel}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}
// raporlar.js dosyanızdaki bu fonksiyonu güncelleyin

// raporlar.js dosyanızdaki bu fonksiyonu güncelleyin

function renderErkenCikanlarRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Erken Çıkan Personel Raporu (${formatliBaslangic} - ${formatliBitis})`;

    // DÜZELTME: Tablo başlığı yeni kolonları içerecek şekilde güncellendi
    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Sicil ID</th>
            <th>Ad Soyad</th>
            <th>Personel No</th>
            <th>Departman</th>
            <th>Firma</th>
            <th>Alt Firma</th>
            <th>Çıkış Saati</th>
            <th>Erken Çıkış Süresi</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const erkenCikanlar = data.filter(p => {
        const cikisSaati = new Date(p.sonCikis || p.SonCikis);
        if (isNaN(cikisSaati.getTime())) return false;
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        return cikisSaati < hedefCikis;
    });

    tabloGovdesi.innerHTML = '';
    if (erkenCikanlar.length === 0) {
        // DÜZELTME: Colspan yeni sütun sayısına göre (9) güncellendi
        tabloGovdesi.innerHTML = '<tr><td colspan="9">Bu aralıkta erken çıkan personel bulunamadı.</td></tr>';
        return;
    }

    erkenCikanlar.sort((a, b) => {
        const tarihA = new Date(a.tarih || a.Tarih);
        const tarihB = new Date(b.tarih || b.Tarih);
        if (tarihA < tarihB) return -1;
        if (tarihA > tarihB) return 1;
        const cikisA = new Date(a.sonCikis || a.SonCikis);
        const cikisB = new Date(b.sonCikis || b.SonCikis);
        return cikisA - cikisB;
    });

    erkenCikanlar.forEach(p => {
        const tr = document.createElement('tr');
        const cikisSaati = new Date(p.sonCikis || p.SonCikis);
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        const erkenCikisDakika = Math.floor((hedefCikis - cikisSaati) / 60000);

        let erkenCikisSuresiMetni = '';
        if (erkenCikisDakika >= 60) {
            const saat = Math.floor(erkenCikisDakika / 60);
            const dakika = erkenCikisDakika % 60;
            erkenCikisSuresiMetni = `${saat} saat`;
            if (dakika > 0) erkenCikisSuresiMetni += ` ${dakika} dk`;
        } else {
            erkenCikisSuresiMetni = `${erkenCikisDakika} dk`;
        }

        // DÜZELTME: innerHTML tüm istenen kolonları içerecek şekilde güncellendi
        tr.innerHTML = `
            <td>${new Date(p.tarih || p.Tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.sicilID || p.SicilID || 'N/A'}</td>
            <td>${p.ad || p.Ad} ${p.soyad || p.Soyad}</td>
            <td>${p.personelNo || p.PersonelNo || 'N/A'}</td>
            <td>${p.departman || p.Departman || 'N/A'}</td>
            <td>${p.firma || p.Firma || 'N/A'}</td>
            <td>${p.altFirma || p.AltFirma || 'N/A'}</td>
            <td>${cikisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${erkenCikisSuresiMetni}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}
function renderIzinlilerRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `İzinli Personel Raporu (${formatliBaslangic} - ${formatliBitis})`;

    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Ad Soyad</th>
            <th>Departman</th>
            <th>İzin Türü</th>
            <th>İzin Başlangıç</th>
            <th>İzin Bitiş</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    tabloGovdesi.innerHTML = '';

    if (!data || data.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="5">Bu aralıkta izinli personel bulunamadı.</td></tr>';
        return;
    }

    data.forEach(p => {
        const tr = document.createElement('tr');
        const izinBaslangic = new Date(p.izinBaslangic).toLocaleDateString('tr-TR');
        const izinBitis = new Date(p.izinBitis).toLocaleDateString('tr-TR');

        tr.innerHTML = `
            <td>${p.ad || p.Ad} ${p.soyad || p.Soyad}</td>
            <td>${p.departman || p.Departman || 'N/A'}</td>
            <td>${p.izinTuru || p.IzinTuru || 'Belirtilmemiş'}</td>
            <td>${izinBaslangic}</td>
            <td>${izinBitis}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}
// === DİĞER RENDER FONKSİYONLARI ===

function renderDepartmanRaporu(departmanOzetleri, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Departman Analiz Raporu (${formatliBaslangic} - ${formatliBitis})`;
    document.getElementById('rapor-tablo-baslik').innerHTML = `<tr><th>Departman</th><th>Kişi Sayısı</th><th>Ortalama Giriş Saati</th><th>Ortalama Çıkış Saati</th></tr>`;
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    tabloGovdesi.innerHTML = '';
    if (!departmanOzetleri || departmanOzetleri.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="4">Bu aralıkta analiz edilecek veri bulunamadı.</td></tr>';
        return;
    }
    departmanOzetleri.forEach(dep => {
        const tr = document.createElement('tr');
        const ortGiris = dep.ortalamaGiris.substring(0, 5);
        const ortCikis = dep.ortalamaCikis.substring(0, 5);
        tr.innerHTML = `<td>${dep.departman}</td><td>${dep.kisiSayisi}</td><td>${ortGiris}</td><td>${ortCikis}</td>`;
        tabloGovdesi.appendChild(tr);
    });
}

// rapor.js dosyanızdaki bu fonksiyonu değiştirin

// raporlar.js dosyanızdaki bu fonksiyonu güncelleyin

// raporlar.js dosyanızdaki bu fonksiyonu güncelleyin

function renderGecGelenlerRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Geç Gelen Personel Raporu (${formatliBaslangic} - ${formatliBitis})`;

    // YENİ: Tablo başlığı istediğiniz kolonları içerecek şekilde güncellendi
    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Sicil ID</th>
            <th>Ad Soyad</th>
            <th>Personel No</th>
            <th>Departman</th>
            <th>Firma</th>
            <th>Alt Firma</th>
            <th>Giriş Saati</th>
            <th>Gecikme Süresi</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    let gecGelenler = data.filter(p => new Date(p.ilkGiris || p.IlkGiris) > new Date(new Date(p.ilkGiris || p.IlkGiris).setHours(8, 45, 0)));

    tabloGovdesi.innerHTML = '';
    if (gecGelenler.length === 0) {
        // Colspan yeni sütun sayısına göre güncellendi
        tabloGovdesi.innerHTML = '<tr><td colspan="9">Bu aralıkta geç kalan personel bulunamadı.</td></tr>';
        return;
    }

    // Sıralama mantığı aynı kalabilir
    gecGelenler.sort((a, b) => {
        const tarihA = new Date(a.tarih || a.Tarih);
        const tarihB = new Date(b.tarih || b.Tarih);
        if (tarihA < tarihB) return -1;
        if (tarihA > tarihB) return 1;
        const girisA = new Date(a.ilkGiris || a.IlkGiris);
        const girisB = new Date(b.ilkGiris || b.IlkGiris);
        return girisB - girisA;
    });

    gecGelenler.forEach(p => {
        const tr = document.createElement('tr');
        const girisSaati = new Date(p.ilkGiris || p.IlkGiris);
        const hedefSaat = new Date(girisSaati).setHours(8, 45, 0);
        const gecikmeDakikasi = Math.floor((girisSaati - hedefSaat) / 60000);

        if (girisSaati > new Date(girisSaati).setHours(9, 0, 0)) {
            tr.classList.add('kritik-gecikme');
        }

        let gecikmeSuresiMetni = '';
        if (gecikmeDakikasi >= 60) {
            const saat = Math.floor(gecikmeDakikasi / 60);
            const dakika = gecikmeDakikasi % 60;
            gecikmeSuresiMetni = `${saat} saat`;
            if (dakika > 0) gecikmeSuresiMetni += ` ${dakika} dk`;
        } else {
            gecikmeSuresiMetni = `${gecikmeDakikasi} dk`;
        }

        // YENİ: innerHTML tüm istenen kolonları içerecek şekilde güncellendi
        tr.innerHTML = `
            <td>${new Date(p.tarih || p.Tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.sicilID || p.SicilID}</td>
            <td>${p.ad || p.Ad} ${p.soyad || p.Soyad}</td>
            <td>${p.personelNo || p.PersonelNo}</td>
            <td>${p.departman || p.Departman || 'N/A'}</td>
            <td>${p.firma || p.Firma || 'N/A'}</td>
            <td>${p.altFirma || p.AltFirma || 'N/A'}</td>
            <td>${girisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${gecikmeSuresiMetni}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}
// raporlar.js dosyanızdaki bu fonksiyonu güncelleyin

// raporlar.js dosyanızdaki bu fonksiyonu güncelleyin

function renderFazlaMesaiRaporu(data, baslangic, bitis) {
    const formatliBaslangic = new Date(baslangic).toLocaleDateString('tr-TR');
    const formatliBitis = new Date(bitis).toLocaleDateString('tr-TR');
    document.getElementById('rapor-baslik').textContent = `Fazla Mesai Raporu (${formatliBaslangic} - ${formatliBitis})`;

    // DÜZELTME: Tablo başlığı yeni kolonları içerecek şekilde güncellendi
    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Sicil ID</th>
            <th>Ad Soyad</th>
            <th>Personel No</th>
            <th>Departman</th>
            <th>Firma</th>
            <th>Alt Firma</th>
            <th>Çıkış Saati</th>
            <th>Fazla Mesai Süresi</th>
        </tr>`;

    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    const mesaiYapanlar = data.filter(p => {
        const cikisSaati = new Date(p.sonCikis || p.SonCikis);
        if (isNaN(cikisSaati.getTime())) return false;
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        return cikisSaati > hedefCikis;
    });

    tabloGovdesi.innerHTML = '';
    if (mesaiYapanlar.length === 0) {
        // DÜZELTME: Colspan yeni sütun sayısına göre (9) güncellendi
        tabloGovdesi.innerHTML = '<tr><td colspan="9">Bu aralıkta fazla mesai yapan personel bulunamadı.</td></tr>';
        return;
    }

    mesaiYapanlar.sort((a, b) => {
        const tarihA = new Date(a.tarih || a.Tarih);
        const tarihB = new Date(b.tarih || b.Tarih);
        if (tarihA < tarihB) return -1;
        if (tarihA > tarihB) return 1;
        const cikisA = new Date(a.sonCikis || a.SonCikis);
        const cikisB = new Date(b.sonCikis || b.SonCikis);
        return cikisB - cikisA;
    });

    mesaiYapanlar.forEach(p => {
        const tr = document.createElement('tr');
        const cikisSaati = new Date(p.sonCikis || p.SonCikis);
        const hedefCikis = new Date(cikisSaati).setHours(17, 30, 0);
        const mesaiDakika = Math.floor((cikisSaati - hedefCikis) / 60000);

        if (mesaiDakika > 30) {
            tr.classList.add('onemli-mesai');
        }

        let mesaiSuresiMetni = '';
        if (mesaiDakika >= 60) {
            const saat = Math.floor(mesaiDakika / 60);
            const dakika = mesaiDakika % 60;
            mesaiSuresiMetni = `${saat} saat`;
            if (dakika > 0) mesaiSuresiMetni += ` ${dakika} dk`;
        } else {
            mesaiSuresiMetni = `${mesaiDakika} dk`;
        }

        // DÜZELTME: innerHTML tüm istenen kolonları içerecek şekilde güncellendi
        tr.innerHTML = `
            <td>${new Date(p.tarih || p.Tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.sicilID || p.SicilID || 'N/A'}</td>
            <td>${p.ad || p.Ad} ${p.soyad || p.Soyad}</td>
            <td>${p.personelNo || p.PersonelNo || 'N/A'}</td>
            <td>${p.departman || p.Departman || 'N/A'}</td>
            <td>${p.firma || p.Firma || 'N/A'}</td>
            <td>${p.altFirma || p.AltFirma || 'N/A'}</td>
            <td>${cikisSaati.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>+${mesaiSuresiMetni.trim()}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}

/**
 * Eksik Mesai ve Devamsızlık raporunu tabloya çizer.
 */
// raporlar.js dosyanızın en altına ekleyin


/**
 * Eksik Mesai ve Devamsızlık raporunu, gelişmiş sıralama ile tabloya çizer.
 */
function renderEksikMesaiRaporu(data, baslangic, bitis) {
    const tabloGovdesi = document.getElementById('rapor-tablo-govdesi');
    tabloGovdesi.innerHTML = '';

    document.getElementById('rapor-tablo-baslik').innerHTML = `
        <tr>
            <th>Tarih</th>
            <th>Sicil ID</th>
            <th>Ad Soyad</th>
         
            <th>Departman</th>
            <th>Firma</th>
            <th>Alt Firma</th>
            <th>Toplam Çalışma süresi</th>
            <th>Durum</th>
        </tr>`;

    if (!data || data.length === 0) {
        tabloGovdesi.innerHTML = '<tr><td colspan="8">Bu kriterlere uygun kayıt bulunamadı.</td></tr>';
        return;
    }

    const getDurumSirasi = (durumStr) => {
        if (durumStr === 'Eksik Mesai') return 1;
        if (durumStr.includes('izinli')) return 2; // Tüm izinli durumları 2. önceliğe alır
        if (durumStr === 'Devamsız') return 3;
        return 4; // Diğer durumlar için
    };

    data.sort((a, b) => {
        // 1. Aşama: Tarihe göre sırala (eskiden yeniye)
        const tarihA = new Date(a.tarih);
        const tarihB = new Date(b.tarih);
        if (tarihA < tarihB) return -1;
        if (tarihA > tarihB) return 1;

        // 2. Aşama: Duruma göre sırala (Eksik Mesai -> İzinli -> Devamsız)
        const durumSirasiA = getDurumSirasi(a.durum);
        const durumSirasiB = getDurumSirasi(b.durum);
        if (durumSirasiA < durumSirasiB) return -1;
        if (durumSirasiA > durumSirasiB) return 1;

        // 3. Aşama (Opsiyonel): Eğer durumlar da aynıysa isme göre sırala
        const adSoyadA = `${a.ad} ${a.soyad}`;
        const adSoyadB = `${b.ad} ${b.soyad}`;
        return adSoyadA.localeCompare(adSoyadB, 'tr');
    });

    data.forEach(p => {
        const tr = document.createElement('tr');
        const toplamMesai = p.toplamMesaiDakika;
        const saat = Math.floor(toplamMesai / 60);
        const dakika = toplamMesai % 60;
        const durum = p.durum;

        // YENİ: Duruma göre satırlara farklı sınıflar ekliyoruz
        if (durum.includes('izinli')) {
            tr.classList.add('izinli-gun'); // Mavi arka plan için
        } else if (durum === 'Devamsız') {
            tr.classList.add('devamsiz-gun');
        } else if (toplamMesai < 480) {
            tr.classList.add('kritik-gecikme');
        }

        tr.innerHTML = `
            <td>${new Date(p.tarih).toLocaleDateString('tr-TR')}</td>
            <td>${p.sicilID}</td>
            <td> <a href="index.html?UserID=${p.userID}" target="_blank"> ${p.ad} ${p.soyad} </a> </td>
            <td>${p.departman || 'N/A'}</td>
            <td>${p.firma || 'N/A'}</td>
            <td>${p.altFirma || 'N/A'}</td>
            <td>${durum.includes('Devamsız') ? '-' : `${saat} saat ${dakika} dk`}</td>
            <td>${durum}</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}



















function exportTableToExcel() {
    const table = document.getElementById("rapor-tablosu");
    if (!table) {
        alert("Aktarılacak tablo bulunamadı!");
        return;
    }
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Rapor" });
    const raporBaslik = document.getElementById('rapor-baslik').textContent;
    XLSX.writeFile(workbook, `${raporBaslik}.xlsx`);
}

function exportPageToPdf() {
    const raporBaslik = document.getElementById('rapor-baslik').textContent;
    const element = document.querySelector(".container");
    const opt = {
        margin: 1,
        filename: `${raporBaslik}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
}