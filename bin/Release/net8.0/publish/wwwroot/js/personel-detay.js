document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');

    const adSoyadBaslik = document.getElementById('personel-adi-baslik');
    const fotoElementi = document.getElementById('personel-detay-foto');
    const detayListesi = document.getElementById('personel-detay-liste');
    const yetkiListesi = document.getElementById('yetki-listesi');

    if (!userId) {
        adSoyadBaslik.textContent = "Personel bulunamadı.";
        return;
    }

    fetch(`/api/data/getinfoDetay/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                adSoyadBaslik.textContent = "Personel bilgileri alınamadı.";
                return;
            }

            const personel = data[0];

            // DÜZELTME: Veriler artık küçük harfle okunuyor (personel.ad, personel.soyad)
            adSoyadBaslik.textContent = `${personel.ad} ${personel.soyad}`;

            // DÜZELTME: Fotoğraf verisi küçük harfle okunuyor (personel.fotobase64)
            if (personel.fotobase64) {
                fotoElementi.src = `data:image/jpeg;base64,${personel.fotobase64}`;
            } else {
                fotoElementi.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%236c757d' viewBox='0 0 16 16'%3E%3Cpath d='M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'/%3E%3C/svg%3E";
            }

            // DÜZELTME: Yetkiler küçük harfle okunuyor (personel.yetkiaciklamalari)
            if (personel.yetkiaciklamalari) {
                const yetkiler = personel.yetkiaciklamalari.split(', ');
                let yetkiHtml = '';
                yetkiler.forEach(yetki => {
                    yetkiHtml += `<li>${yetki}</li>`;
                });
                yetkiListesi.innerHTML = yetkiHtml;
            } else {
                yetkiListesi.innerHTML = '<li>Tanımlı yetki bulunamadı.</li>';
            }

            let listeHtml = '<ul>';
            for (const key in personel) {
                // DÜZELTME: Atlanacak alanlar da küçük harfle yazıldı
                const atlanacakAlanlar = ['ad', 'soyad', 'fotobase64', 'yetkiaciklamalari', 'yetkistr'];
                if (atlanacakAlanlar.includes(key) || !personel[key]) {
                    continue;
                }

                let value = personel[key];
                // Tarihleri formatla
                if ((key.includes('tarih') || key.includes('giris')) && value.toString().includes('T')) {
                    value = new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
                }

                // Gelen anahtar kelimeyi daha okunabilir hale getirelim (ör: 'userid' -> 'UserID')
                const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);

                listeHtml += `<li><strong>${formattedKey}:</strong> <span>${value}</span></li>`;
            }
            listeHtml += '</ul>';
            detayListesi.innerHTML = listeHtml;
        })
        .catch(error => {
            console.error("Personel detayları alınırken hata:", error);
            adSoyadBaslik.textContent = "Veri alınırken hata oluştu.";
        });
});