//===================================================================
//Muhammed Furkan Atak 
//furkanatak.work@gmail.com
//05362058576
//tarih : 08/25/25
//===================================================================


//bu sorgudaki sql kodları meyer database ine procodure olarak eklenebilir


using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Data.SqlClient;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DataController : ControllerBase
    {


        private readonly string _connectionString;

        public DataController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }
        [HttpGet("testconnection")]
        public async Task<IActionResult> TestConnection()
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                try
                {
                    await connection.OpenAsync();
                    return Ok("Veritabanı bağlantısı başarıyla kuruldu!");
                }
                catch (SqlException ex)
                {
                    return StatusCode(500, $"Veritabanı bağlantı hatası: {ex.Message}");
                }
            }
        }

        

        [HttpGet("getinfo/{userId}")]
        public IActionResult Getinfo(int userId)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
          SELECT
    s.*, 
    P.fotoimage, 
    B.Ad AS Departman
FROM
    Sicil s
LEFT JOIN
    SicilFoto P ON s.ID = P.sicilid
LEFT JOIN
    cbo_bolum B ON s.Bolum = B.ID
WHERE
    CAST(S.UserID AS INT) = @userId;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {

                            string fotoBase64 = null;
                            if (reader["fotoimage"] != DBNull.Value)
                            {
                                byte[] fotoBytes = (byte[])reader["fotoimage"];
                                fotoBase64 = Convert.ToBase64String(fotoBytes);
                            }

                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                PersonleNo = reader["PersonelNo"],
                                Giris = reader["GirisTarih"],
                                Dogum = reader["DogumTarih"],
                                Tel = reader["CepTelefon"],
                                Email= reader["Email"],
                                Departman = reader["Departman"],


                                foto = fotoBase64
                            });
                        }
                    }
                }
            }

            return Ok(result);

         }




        [HttpGet("getIzin/{userId}")]
        public IActionResult GetInfo(int userId)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
                         SELECT 
                             i.BasTarih,
                             i.BitTarih
                                FROM Izinler i
                                INNER JOIN Sicil s ON i.SicilID = s.ID
                                WHERE s.UserID = @UserID;

        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    // Bu parametre artık WHERE şartı tarafından kullanılacak
                    cmd.Parameters.AddWithValue("@UserId", userId);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {

                           

                            result.Add(new
                            {
                                basTarih = reader["BasTarih"],
                                bitTarih = reader["BitTarih"],
                  

                            });
                        }
                    }
                }
            }

            return Ok(result);

        }






        [HttpGet("personel-mesai")]
        public IActionResult GetPersonelMesai()
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
SELECT
    S.UserID,
    S.Ad,
    S.Soyad,
    CONVERT(date, P.EventTime) AS Tarih,
    
    MIN(P.EventTime) AS IlkGiris,
    
    MAX(P.EventTime) AS SonCikis,
    
    DATEDIFF(MINUTE,
        MIN(P.EventTime),
        MAX(P.EventTime)
    ) AS ToplamMesaiDakika
FROM
    Pool P
JOIN
    Sicil S ON CAST(P.UserID AS INT) = S.UserID
-- DÜZELTME: Terminaller tablosuna artık gerek yok
GROUP BY
    S.UserID, S.Ad, S.Soyad, CONVERT(date, P.EventTime)
HAVING
    MIN(P.EventTime) < MAX(P.EventTime);
                ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            Ad = reader["Ad"],
                            Soyad = reader["Soyad"],
                            Tarih = reader["Tarih"],
                            IlkGiris = reader["IlkGiris"],
                            SonCikis = reader["SonCikis"],
                            ToplamMesaiDakika = reader["ToplamMesaiDakika"]
                        });
                    }
                }
            }

            return Ok(result);
        }


        //=================================
        // userıd si girilen çalışanın tüm mesai verilerini çeken api
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================

        [HttpGet("mesai/{userId}")]
        public IActionResult GetPersonelMesai(int userId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                // DÜZELTME: Sorguya SicilID, PersonelNo ve CardID eklendi.
                string query = @"
                   SELECT
    CONVERT(date, P.EventTime) AS Tarih,
    MIN(P.EventTime) AS IlkGiris,
    MAX(P.EventTime) AS SonCikis,
    DATEDIFF(MINUTE, MIN(P.EventTime), MAX(P.EventTime)) AS ToplamMesaiDakika,
    S.ID,
    S.PersonelNo,
    U.CardID,

    -- Tekleştirilmiş izin tarihleri
    COALESCE(iGun.BasTarih, iSaat.BasTarih) AS izinBasTarih,
    COALESCE(iGun.BitTarih, iSaat.BitTarih) AS izinBitTarih

FROM Pool P
JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
LEFT JOIN UserList U ON S.UserID = U.UserID

-- Gün bazlı izin
LEFT JOIN Izinler iGun 
       ON iGun.SicilID = S.ID
      AND CONVERT(date, P.EventTime) 
          BETWEEN CONVERT(date, iGun.BasTarih) AND CONVERT(date, iGun.BitTarih)

-- Saat bazlı izin
LEFT JOIN Izinler iSaat 
       ON iSaat.SicilID = S.ID
      AND P.EventTime BETWEEN iSaat.BasTarih AND iSaat.BitTarih

WHERE S.UserID = @UserID
GROUP BY CONVERT(date, P.EventTime), 
         S.ID, S.PersonelNo, U.CardID, 
         COALESCE(iGun.BasTarih, iSaat.BasTarih),
         COALESCE(iGun.BitTarih, iSaat.BitTarih)
HAVING MIN(P.EventTime) < MAX(P.EventTime);


        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                izinBitTarih = reader["izinBitTarih"],
                                izinBasTarih = reader["izinBasTarih"],

                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"],
                                ToplamMesaiDakika = reader["ToplamMesaiDakika"],
                                // YENİ: Yeni verileri JSON'a ekliyoruz
                                SicilID = reader["ID"],
                                PersonelNo = reader["PersonelNo"],
                                CardID = reader["CardID"],
                                UserID=userId
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }



        //=================================
        // Personel listesi ni çeken api , personlellerin ad,soyad,departman, ve foto bilgisini getiriyor
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================
        [HttpGet("personeller")]
        public IActionResult GetPersoneller()
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            WITH SinglePhoto AS (
                SELECT sicilid, fotoimage, ROW_NUMBER() OVER(PARTITION BY sicilid ORDER BY sicilid) AS rn
                FROM SicilFoto
            )
            SELECT
                S.UserID, S.Ad, S.Soyad,
                B.Ad AS DepartmanAdi,
                F.Ad AS FirmaAdi,
                AF.Ad AS AltFirmaAdi,
                SP.fotoimage AS FotoData
            FROM Sicil S
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            LEFT JOIN cbo_firma F ON S.firma = F.ID
            LEFT JOIN cbo_altfirma AF ON S.altfirma = AF.ID
            LEFT JOIN SinglePhoto SP ON S.ID = SP.sicilid AND SP.rn = 1
            WHERE 
                -- 1. Kural: Personel aktif olmalı
                S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                -- 2. YENİ KURAL: Ve personelin son 30 gün içinde Pool tablosunda en az bir kaydı olmalı
                AND EXISTS (
                    SELECT 1 
                    FROM Pool P 
                    WHERE CAST(P.UserID AS INT) = S.UserID 
                      AND P.EventTime >= DATEADD(day, -30, GETDATE())
                );
        
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            Ad = reader["Ad"]?.ToString(),
                            Soyad = reader["Soyad"]?.ToString(),
                            Departman = reader["DepartmanAdi"]?.ToString(),
                            Firma = reader["FirmaAdi"]?.ToString(),
                            AltFirma = reader["AltFirmaAdi"]?.ToString(),
                            FotoBase64 = (reader["FotoData"] != DBNull.Value) ? Convert.ToBase64String((byte[])reader["FotoData"]) : null
                        });
                    }
                }
            }
            return Ok(result);
        }


        //=================================
        // Verilen aralıktaki , geç gelen,erken gelen, geç çıkan, personlleri seçen ve bu personlleri departmanına göre de gruplandıran api sorgusu
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================



   




        [HttpGet("aralik-raporu")]
        public IActionResult GetAralikRaporu([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var personelOzetleri = new List<object>();
            var araliginEnleri = new List<object>();
            var departmanOzetleri = new List<object>();
            // Diğer rapor listelerini de burada tanımlayabilirsiniz (devamsızlar, izinliler vb.)

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Sorgu, sadece son 30 günde aktif olan personelleri dikkate alacak şekilde güncellendi.
                string query = @"
            IF OBJECT_ID('tempdb..#GunlukMesai') IS NOT NULL
                DROP TABLE #GunlukMesai;

            SELECT
                S.UserID, S.Ad, S.Soyad, B.Ad AS departman,
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris,
                MAX(P.EventTime) AS SonCikis
            INTO #GunlukMesai
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE 
                CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
                AND S.GirisTarih IS NOT NULL 
                AND S.CikisTarih IS NULL
                AND EXISTS (
                    SELECT 1 
                    FROM Pool P_check 
                    WHERE CAST(P_check.UserID AS INT) = S.UserID 
                      AND P_check.EventTime >= DATEADD(day, -30, GETDATE())
                )
            GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
            HAVING MIN(P.EventTime) < MAX(P.EventTime);

            -- SORGU 1: Personel Bazlı Özetler
            SELECT
                UserID, Ad, Soyad, departman,
                SUM(CASE WHEN IlkGiris > DATEADD(minute, 45, DATEADD(hour, 8, CAST(Tarih AS datetime))) THEN 1 ELSE 0 END) AS GecKalmaSayisi,
                SUM(CASE WHEN SonCikis < DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))) THEN 1 ELSE 0 END) AS ErkenCikmaSayisi,
                SUM(CASE WHEN SonCikis > DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))) THEN DATEDIFF(MINUTE, DATEADD(minute, 30, DATEADD(hour, 17, CAST(Tarih AS datetime))), SonCikis) ELSE 0 END) AS ToplamFazlaMesaiDakika
            FROM #GunlukMesai
            GROUP BY UserID, Ad, Soyad, departman;

            -- SORGU 2: Aralığın En'leri
            WITH Numaralandirilmis AS (
                SELECT *,
                    ROW_NUMBER() OVER(PARTITION BY Tarih ORDER BY IlkGiris ASC) as rn_erken,
                    ROW_NUMBER() OVER(PARTITION BY Tarih ORDER BY SonCikis DESC) as rn_gec
                FROM #GunlukMesai
            )
            SELECT
                E.Tarih, E.Ad + ' ' + E.Soyad AS EnErkenGelenIsim, E.IlkGiris AS EnErkenGelisSaati,
                G.Ad + ' ' + G.Soyad AS EnGecCikanIsim, G.SonCikis AS EnGecCikisSaati
            FROM Numaralandirilmis E
            JOIN Numaralandirilmis G ON E.Tarih = G.Tarih
            WHERE E.rn_erken = 1 AND G.rn_gec = 1
            ORDER BY E.Tarih;

            -- SORGU 3: Departman Bazlı Analizler
            SELECT
                ISNULL(departman, 'Belirtilmemiş') AS Departman,
                COUNT(DISTINCT UserID) as KisiSayisi,
                CONVERT(time, DATEADD(ms, AVG(CAST(DATEDIFF(ms, '00:00:00', CONVERT(time, IlkGiris)) AS BIGINT)), '00:00:00')) AS OrtalamaGiris,
                CONVERT(time, DATEADD(ms, AVG(CAST(DATEDIFF(ms, '00:00:00', CONVERT(time, SonCikis)) AS BIGINT)), '00:00:00')) AS OrtalamaCikis
            FROM #GunlukMesai
            GROUP BY departman;

           
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {

                        while (reader.Read())
                        {
                            personelOzetleri.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                GecKalmaSayisi = reader["GecKalmaSayisi"],
                                ErkenCikmaSayisi = reader["ErkenCikmaSayisi"],

                                ToplamFazlaMesaiDakika = reader["ToplamFazlaMesaiDakika"]
                            });
                        }

                        if (reader.NextResult())
                        {
                            while (reader.Read())
                            {
                                araliginEnleri.Add(new
                                {
                                    Tarih = reader["Tarih"],
                                    EnErkenGelenIsim = reader["EnErkenGelenIsim"],
                                    EnErkenGelisSaati = reader["EnErkenGelisSaati"],
                                    EnGecCikanIsim = reader["EnGecCikanIsim"],
                                    EnGecCikisSaati = reader["EnGecCikisSaati"]
                                });
                            }
                        }


                        if (reader.NextResult())
                        {
                            while (reader.Read())
                            {
                                departmanOzetleri.Add(new
                                {
                                    Departman = reader["Departman"],
                                    KisiSayisi = reader["KisiSayisi"],
                                    OrtalamaGiris = reader["OrtalamaGiris"],
                                    OrtalamaCikis = reader["OrtalamaCikis"]
                                });
                            }
                        }
                    }
                }
            }
            var finalResult = new
            {
                PersonelOzetleri = personelOzetleri,
                AraliginEnleri = araliginEnleri,
                DepartmanOzetleri = departmanOzetleri
            };

            return Ok(finalResult);
        }


























        //=================================
        // aralık-raporu api nda çıkan outputların detaylı bilgisini veren kısımi listele butonuna tıklandığında çalışacak sorgu
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================

        // DataController.cs dosyanızdaki bu metodu güncelleyin
        [HttpGet("aralik-detaylari")]
        public IActionResult GetAralikDetaylari([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                            [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
    S.UserID, S.Ad, S.Soyad, S.PersonelNo, S.SicilNo,
    B.Ad AS DepartmanAdi,
    F.Ad AS FirmaAdi,
    AF.Ad AS AltFirmaAdi,
    POZ.Ad AS PozisyonAdi,
    CONVERT(date, P.EventTime) AS Tarih,
    MIN(P.EventTime) AS IlkGiris,
    MAX(P.EventTime) AS SonCikis,

    -- İlk giriş yapılan terminal
    (SELECT TOP 1 T.Name
     FROM Pool P_in
     JOIN Terminaller T ON T.ID = P_in.TerminalID
     WHERE CAST(P_in.UserID AS INT) = S.UserID
       AND CONVERT(date, P_in.EventTime) = CONVERT(date, P.EventTime)
     ORDER BY P_in.EventTime ASC) AS IlkGirisTerminal,

    -- Son çıkış yapılan terminal
    (SELECT TOP 1 T.Name
     FROM Pool P_out
     JOIN Terminaller T ON T.ID = P_out.TerminalID
     WHERE CAST(P_out.UserID AS INT) = S.UserID
       AND CONVERT(date, P_out.EventTime) = CONVERT(date, P.EventTime)
     ORDER BY P_out.EventTime DESC) AS SonCikisTerminal

FROM Pool P
JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
LEFT JOIN cbo_pozisyon POZ ON S.pozisyon = POZ.ID
LEFT JOIN cbo_firma F ON S.firma = F.ID
LEFT JOIN cbo_altfirma AF ON S.altfirma = AF.ID
WHERE 
    CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
    AND S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
    AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
    AND (@FirmaId IS NULL OR S.firma = @FirmaId)
    AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
GROUP BY 
    S.UserID, S.Ad, S.Soyad, S.PersonelNo, S.SicilNo,
    B.Ad, F.Ad, AF.Ad, POZ.Ad, 
    CONVERT(date, P.EventTime)
HAVING MIN(P.EventTime) < MAX(P.EventTime)
ORDER BY Tarih, IlkGiris;

        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                PersonelNo = reader["PersonelNo"],
                                SicilNo = reader["SicilNo"],
                                SicilID = reader["SicilNo"],
                                Departman = reader["DepartmanAdi"],
                                Firma = reader["FirmaAdi"],
                                AltFirma = reader["AltFirmaAdi"],
                                Pozisyon = reader["PozisyonAdi"],
                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"],
                                girisTerminal = reader["IlkGirisTerminal"] == DBNull.Value ? null : reader["IlkGirisTerminal"],
                                cikisTerminal = reader["SonCikisTerminal"] == DBNull.Value ? null : reader["SonCikisTerminal"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }
        //=================================
        // bu api seçili gün aralığında gelmeyen personlleri listeliyor , sicil tablosunda işe giriş,çıkış tarihlerine bakarak seçili gün aralığında mevcut çalışanlar arasında
        // pool tablosundan o gün giriş,çıkış datası olmayan personelleri bulup listeliyor.
        // burdaki sql sorgusu daha sonra database e  PROCODURE olarak eklenebilir
        //=================================

        [HttpGet("getGelmeyenler")]
        public IActionResult GetGelmeyenler([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                     [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
            WITH AktifPersoneller AS (
                SELECT UserID, Ad, Soyad, Bolum, firma, altfirma, GirisTarih, CikisTarih, EMail, CepTelefon
                FROM Sicil
                WHERE GirisTarih IS NOT NULL AND CikisTarih IS NULL
            ),

            Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            ),

            GelenPersoneller AS (
                SELECT DISTINCT CONVERT(date, P.EventTime) AS Tarih, CAST(P.UserID AS INT) AS UserID
                FROM Pool P WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),

            BeklenenGelisler AS (
                SELECT
                    T.Tarih, S.UserID, S.Ad, S.Soyad, B.Ad AS departman, S.EMail, S.CepTelefon
                FROM Takvim T
                CROSS JOIN AktifPersoneller S -- Artık tüm Sicil yerine sadece aktif olanları kullanıyoruz
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
                    -- YENİ: Opsiyonel Filtreler
                    AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                    AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                    AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            )

            SELECT
                BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon,
                COUNT(BG.Tarih) AS DevamsizlikGunSayisi
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            GROUP BY BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon
            ORDER BY DevamsizlikGunSayisi DESC
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"],
                                devamsizlikGunSayisi = reader["DevamsizlikGunSayisi"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }

        // seçilen aralıkta izinliler tablosundaki personller ve izin aralıığı bilgisini getiriyor


        [HttpGet("getIzinliler")]
        public IActionResult GetIzinliler([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                  [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                S.UserID, S.Ad, S.Soyad, B.Ad AS departman, S.EMail, S.CepTelefon AS CepTelefon,
                I.BasTarih, I.BitTarih, I.Aciklama
            FROM Izinler I
            JOIN Sicil S ON I.SicilID = S.ID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE
                S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                AND CONVERT(date, I.BasTarih) <= @Bitis 
                AND CONVERT(date, I.BitTarih) >= @Baslangic
                -- Opsiyonel Filtreler
                AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            ORDER BY I.BasTarih, S.Ad;
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"],
                                IzinBaslangic = reader["BasTarih"],
                                IzinBitis = reader["BitTarih"],
                                IzinTuru = reader["Aciklama"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }


      
        [HttpGet("erken-cikma-detaylari")]
        public IActionResult GetErkenCikmaDetaylari([FromQuery] int userId, [FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MAX(P.EventTime) AS SonCikis
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            WHERE 
                S.UserID = @UserId 
                AND CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY CONVERT(date, P.EventTime)
            HAVING 
                -- 1. Kural: Erken çıkmış olmalı (Örnek: 17:30 öncesi)
                MAX(P.EventTime) < DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime)))
                -- 2. Kural: Ve o gün hem giriş hem çıkış hareketi olmalı
                AND MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                SonCikis = reader["SonCikis"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }





        [HttpGet("getGelmeyenlerDetay")]
        public IActionResult GetGelmeyenlerDetay([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                                  [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
            WITH AktifVeIlgiliPersoneller AS (
                SELECT * FROM Sicil
                WHERE GirisTarih IS NOT NULL AND CikisTarih IS NULL
                  AND EXISTS (
                      SELECT 1 
                      FROM Pool P_check 
                      WHERE CAST(P_check.SicilID AS INT) = Sicil.UserID 
                        AND P_check.EventTime >= DATEADD(day, -30, GETDATE())
                  )
            ),
            Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            ),
            GelenPersoneller AS (
                SELECT DISTINCT CONVERT(date, P.EventTime) AS Tarih, CAST(P.SicilID AS INT) AS UserID
                FROM Pool P WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),
            BeklenenGelisler AS (
                SELECT
                    T.Tarih, S.UserID, S.Ad, S.Soyad, B.Ad AS departman,
                    POZ.Ad AS PozisyonAdi, -- YENİ: Pozisyon adı eklendi
                    S.EMail, S.CepTelefon
                FROM Takvim T
                CROSS JOIN AktifVeIlgiliPersoneller S
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                LEFT JOIN cbo_pozisyon POZ ON S.pozisyon = POZ.ID -- YENİ JOIN
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
                    AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                    AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                    AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId)
            )
            SELECT
                BG.Tarih, BG.UserID, BG.Ad, BG.Soyad, BG.departman,
                BG.PozisyonAdi, -- YENİ: Pozisyon adı sonuca eklendi
                BG.EMail, BG.CepTelefon
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            ORDER BY BG.Tarih, BG.Ad
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                Pozisyon = reader["PozisyonAdi"], // YENİ
                                Tarih = reader["Tarih"],
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }








        [HttpGet("gec-kalma-detaylari")]
        public IActionResult GetGecKalmaDetaylari([FromQuery] int userId, [FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(P.EventTime) AS IlkGiris
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            WHERE 
                S.UserID = @UserId 
                AND CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY CONVERT(date, P.EventTime)
            HAVING 
                MIN(P.EventTime) > DATEADD(minute, 30, DATEADD(hour, 8, CAST(CONVERT(date, P.EventTime) AS datetime)))
                
                AND MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }

        // seçilen gün aralığında 8 saatten fazla çalışan personelleri getiriyor

        [HttpGet("fazla-mesai-detaylari")]
        public IActionResult GetFazlaMesaiDetaylari([FromQuery] int userId, [FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT
                CONVERT(date, P.EventTime) AS Tarih,
                MAX(P.EventTime) AS SonCikis,
                DATEDIFF(MINUTE, 
                    DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime))), 
                    MAX(P.EventTime)
                ) AS FazlaMesaiDakika
            FROM Pool P
            JOIN Sicil S ON CAST(P.UserID AS INT) = S.UserID
            WHERE 
                S.UserID = @UserId 
                AND CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            GROUP BY CONVERT(date, P.EventTime)
            HAVING 
                MAX(P.EventTime) > DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime)))
                AND MIN(P.EventTime) < MAX(P.EventTime)
            ORDER BY Tarih;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@UserId", userId);
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                Tarih = reader["Tarih"],
                                SonCikis = reader["SonCikis"],
                                FazlaMesaiDakika = reader["FazlaMesaiDakika"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }


        //bu sorgu eksik-mesai sorgusuna eklendi , şuan kullanılmıyor

        [HttpGet("getDevamsizDetay")]
        public IActionResult GetDevamsizDetay([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis, [FromQuery] int? userId)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            WITH Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            ),
            GelenPersoneller AS (
                SELECT DISTINCT CONVERT(date, P.EventTime) AS Tarih, CAST(P.UserID AS INT) AS UserID
                FROM Pool P WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
            ),
            BeklenenGelisler AS (
                SELECT
                    T.Tarih, S.UserID, S.Ad, S.Soyad, B.Ad AS departman, S.EMail, S.CepTelefon AS CepTelefon
                FROM Takvim T
                CROSS JOIN Sicil S
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE
                    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
                    AND T.Tarih >= CONVERT(date, S.GirisTarih)
                    AND (S.CikisTarih IS NULL OR T.Tarih <= CONVERT(date, S.CikisTarih))
                    -- DÜZELTME: Eğer bir userId gönderildiyse, sadece o kişiyi dikkate al
                    AND (@UserId IS NULL OR S.UserID = @UserId)
            )
            SELECT
                BG.Tarih, BG.UserID, BG.Ad, BG.Soyad, BG.departman, BG.EMail, BG.CepTelefon
            FROM BeklenenGelisler BG
            LEFT JOIN GelenPersoneller GP ON BG.UserID = GP.UserID AND BG.Tarih = GP.Tarih
            WHERE GP.UserID IS NULL
            ORDER BY BG.Tarih, BG.Ad
            OPTION (MAXRECURSION 0);
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    // DÜZELTME: Yeni userId parametresini sorguya ekle
                    cmd.Parameters.AddWithValue("@UserId", (object)userId ?? DBNull.Value);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["departman"],
                                Tarih = reader["Tarih"], // Artık her satırda tarih bilgisi var
                                tel = reader["CepTelefon"],
                                Email = reader["EMail"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }





        [HttpGet("filtre-verileri")]
        public IActionResult GetFiltreVerileri()
        {
            var departmanlar = new List<object>();
            var firmalar = new List<object>();
            var altFirmalar = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT ID, Ad FROM cbo_bolum ORDER BY Ad;
            SELECT ID, Ad FROM cbo_firma ORDER BY Ad;
            SELECT ID, Ad FROM cbo_altfirma ORDER BY Ad;
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read()) { departmanlar.Add(new { ID = reader["ID"], Ad = reader["Ad"] }); }
                    reader.NextResult();
                    while (reader.Read()) { firmalar.Add(new { ID = reader["ID"], Ad = reader["Ad"] }); }
                    reader.NextResult();
                    while (reader.Read()) { altFirmalar.Add(new { ID = reader["ID"], Ad = reader["Ad"] }); }
                }
            }
            return Ok(new { departmanlar, firmalar, altFirmalar });
        }





        //filtre kısmında üst filtreden alt filtreye giderken güncelleme işlemi yapması için , örnek: tp-otc istanbul seçti firmayı alt firmalar larak o , firmanın alt firmaları listeleniyor sadece.



        [HttpGet("filtre-haritasi")]
        public IActionResult GetFiltreHaritasi()
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();
                string query = @"
            SELECT 
                S.UserID,
                S.firma AS FirmaId,
                f.Ad AS FirmaAdi,
                S.altfirma AS AltFirmaId,
                af.Ad AS AltFirmaAdi,
                S.Bolum AS DepartmanId,
                b.Ad AS DepartmanAdi
            FROM Sicil S
            LEFT JOIN cbo_firma f ON S.firma = f.ID
            LEFT JOIN cbo_altfirma af ON S.altfirma = af.ID
            LEFT JOIN cbo_bolum b ON S.Bolum = b.ID
            WHERE S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL;
        ";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            FirmaId = reader["FirmaId"],
                            FirmaAdi = reader["FirmaAdi"],
                            AltFirmaId = reader["AltFirmaId"],
                            AltFirmaAdi = reader["AltFirmaAdi"],
                            DepartmanId = reader["DepartmanId"],
                            DepartmanAdi = reader["DepartmanAdi"]
                        });
                    }
                }
            }
            return Ok(result);
        }








        //=============================================================================================
        //Bu sorgu önce şu şartları sağlayan personelleri listeler:
        //-son 30 gün içinde pool tablosunda kaydı varmı
        //-işe giriş tarihi girilmiş ama çıkış tarihi girilmemiş
        //sonrasında verilen filtrele göre seçim yapar (firma,altfirma,departman), devamında ise seçilen tarih aralığında bu kişi günlük 8 saat mesai yapmışmı onu kontrol eder.(  (işten çıkış saati-giriş saati > 8 )? )
        //not !! : terminallerden giriş çıkış kontorlu yapmıyor, sadece o gün içinde ilk okuttuğu kart bilgisi ile son okuttuğu kart bilgisini alıyor.
        //devamsızlık rapounda ise , aftaiçi o gün işe gelmesi gerekip gelmeyenleri listeliyor, ve bu kişileri izinliler tablosundan chechk ediyor. aynı işlemi eksik mesaililer içinde yapıyor, saatlik izni varmı diye 
        //=============================================================================================

        [HttpGet("eksik-mesai-ve-devamsizlik-raporu")]
        public IActionResult GetEksikMesaiVeDevamsizlikRaporu([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis,
                                          [FromQuery] int? departmanId, [FromQuery] int? firmaId, [FromQuery] int? altFirmaId,
                                          [FromQuery] string? durumFiltresi)
        {
            var result = new List<object>();
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                string query = @"
            IF OBJECT_ID('tempdb..#IlgiliPersoneller') IS NOT NULL DROP TABLE #IlgiliPersoneller;
            IF OBJECT_ID('tempdb..#GunlukMesailer') IS NOT NULL DROP TABLE #GunlukMesailer;

            SELECT 
                S.UserID, S.Ad, S.Soyad, S.Bolum, S.firma, S.altfirma, S.GirisTarih, S.ID AS SicilTabloID,
                B.Ad AS DepartmanAdi, F.Ad AS FirmaAdi, AF.Ad AS AltFirmaAdi,S.SicilNo,S.PersonelNo
            INTO #IlgiliPersoneller
            FROM Sicil S
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            LEFT JOIN cbo_firma F ON S.firma = F.ID
            LEFT JOIN cbo_altfirma AF ON S.altfirma = AF.ID
            WHERE 
                S.GirisTarih IS NOT NULL AND S.CikisTarih IS NULL
                AND EXISTS (
                    SELECT 1 FROM Pool P_check 
                    WHERE CAST(P_check.UserID AS INT) = S.UserID AND P_check.EventTime >= DATEADD(day, -30, GETDATE())
                )
                AND (@DepartmanId IS NULL OR S.Bolum = @DepartmanId)
                AND (@FirmaId IS NULL OR S.firma = @FirmaId)
                AND (@AltFirmaId IS NULL OR S.altfirma = @AltFirmaId);

            SELECT
    S.UserID, 
    CONVERT(date, P.EventTime) AS Tarih,
    DATEDIFF(MINUTE, MIN(P.EventTime), MAX(P.EventTime)) AS ToplamMesaiDakika,
    S.SicilTabloID,
    S.SicilNo,
    S.PersonelNo,

    (SELECT TOP 1 T.Name 
     FROM Pool P_in 
     JOIN Terminaller T ON T.ID = P_in.TerminalID
     WHERE CAST(P_in.UserID AS INT) = S.UserID
       AND CONVERT(date, P_in.EventTime) = CONVERT(date, P.EventTime)
     ORDER BY P_in.EventTime ASC) AS Giris_Terminal,

    (SELECT TOP 1 T.Name 
     FROM Pool P_out 
     JOIN Terminaller T ON T.ID = P_out.TerminalID
     WHERE CAST(P_out.UserID AS INT) = S.UserID
       AND CONVERT(date, P_out.EventTime) = CONVERT(date, P.EventTime)
     ORDER BY P_out.EventTime DESC) AS Cikis_Terminal

INTO #GunlukMesailer
FROM Pool P
JOIN #IlgiliPersoneller S ON CAST(P.UserID AS INT) = S.UserID
WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
GROUP BY S.UserID, CONVERT(date, P.EventTime), S.SicilTabloID, S.SicilNo, S.PersonelNo
HAVING MIN(P.EventTime) < MAX(P.EventTime);
            
            WITH Takvim AS (
                SELECT CAST(@Baslangic AS DATE) AS Tarih
                UNION ALL
                SELECT DATEADD(day, 1, Tarih) FROM Takvim WHERE Tarih < @Bitis
            )
            
            SELECT * FROM (
SELECT
    S.UserID, S.Ad, S.Soyad, S.DepartmanAdi, S.FirmaAdi, S.AltFirmaAdi,
    GM.Tarih, GM.ToplamMesaiDakika, S.SicilTabloID, S.SicilNo, S.PersonelNo,
    GM.Giris_Terminal, GM.Cikis_Terminal,  -- BURADA EKLENDİ
    
    CASE
        WHEN I.SicilID IS NOT NULL 
        THEN 'Eksik Mesai (' + ISNULL('izinli : ' + IT.Aciklama, 'İzinli') + ')' 
             + ' ' + FORMAT(I.BasTarih, 'HH:mm') + '-' + FORMAT(I.BitTarih, 'HH:mm') + ')'
        ELSE 'Eksik Mesai'
    END AS Durum
FROM #GunlukMesailer GM
JOIN #IlgiliPersoneller S ON GM.UserID = S.UserID
LEFT JOIN Izinler I ON GM.UserID = I.SicilID AND GM.Tarih = CONVERT(date, I.BasTarih) AND I.Saatlikizin = 1
LEFT JOIN IzinTipleri IT ON I.TipID = IT.ID
WHERE GM.ToplamMesaiDakika < 480


                UNION ALL
SELECT
    S.UserID, S.Ad, S.Soyad, S.DepartmanAdi, S.FirmaAdi, S.AltFirmaAdi,
    T.Tarih, 0 AS ToplamMesaiDakika, S.SicilTabloID, S.SicilNo, S.PersonelNo,
    NULL AS Giris_Terminal,   -- EKLENDİ
    NULL AS Cikis_Terminal,   -- EKLENDİ
    
    CASE 
        WHEN I.SicilID IS NOT NULL
        THEN 'Devamsız (' + ISNULL(IT.Aciklama, 'izinli') + ')' 
        ELSE 'Devamsız' 
    END AS Durum
FROM Takvim T
CROSS JOIN #IlgiliPersoneller S
LEFT JOIN Izinler I ON I.SicilID = S.SicilTabloID 
   AND T.Tarih BETWEEN CONVERT(date, I.BasTarih) AND CONVERT(date, I.BitTarih) 
   AND (I.Saatlikizin = 0 OR I.Saatlikizin IS NULL)
LEFT JOIN IzinTipleri IT ON I.TipID = IT.ID
WHERE
    DATENAME(weekday, T.Tarih) NOT IN ('Saturday', 'Sunday', 'Cumartesi', 'Pazar')
    AND T.Tarih >= CONVERT(date, S.GirisTarih)
    AND NOT EXISTS (SELECT 1 FROM #GunlukMesailer GM WHERE GM.UserID = S.UserID AND GM.Tarih = T.Tarih)

            ) AS Sonuc

WHERE (@DurumFiltresi IS NULL OR Durum LIKE '%' + @DurumFiltresi + '%')
            ORDER BY Tarih, Ad
            OPTION (MAXRECURSION 0);

        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Baslangic", baslangic.Date);
                    cmd.Parameters.AddWithValue("@Bitis", bitis.Date);
                    cmd.Parameters.AddWithValue("@DepartmanId", (object)departmanId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@FirmaId", (object)firmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@AltFirmaId", (object)altFirmaId ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@DurumFiltresi", string.IsNullOrEmpty(durumFiltresi) ? DBNull.Value : (object)durumFiltresi);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            result.Add(new
                            {
                                UserID = reader["UserID"],
                                SicilID = reader["SicilTabloID"],
                                SicilNo = reader["SicilNo"],
                                personelNo = reader["PersonelNo"],

                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                Departman = reader["DepartmanAdi"],
                                Firma = reader["FirmaAdi"],
                                AltFirma = reader["AltFirmaAdi"],
                                Tarih = reader["Tarih"],
                                ToplamMesaiDakika = reader["ToplamMesaiDakika"],
                                Durum = reader["Durum"],
                                girisTerminal = reader["Giris_Terminal"] == DBNull.Value ? null : reader["Giris_Terminal"],
                                cikisTerminal = reader["Cikis_Terminal"] == DBNull.Value ? null : reader["Cikis_Terminal"],

                            });
                        }
                    }
                }
            }
            return Ok(result);
        }
    }

    }