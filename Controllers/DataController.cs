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
        private readonly string _connectionString = "Data Source=APP-ACCESS\\MEYER;Initial Catalog=TPANGEL15130TESTM5_Meyer;Integrated Security=True;Pooling=False;Connect Timeout=30;Trust Server Certificate=True;Application Name=vscode-mssql;Application Intent=ReadWrite;Command Timeout=30";

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

                // Sadece istenen personeli getirmesi için WHERE şartı eklendi
                string query = @"
           SELECT* from Sicil where CAST(Sicil.UserID AS INT) = @userıd
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
                                UserID = reader["UserID"],
                                Ad = reader["Ad"],
                                Soyad = reader["Soyad"],
                                PersonleNo = reader["PersonelNo"],
                                Giris = reader["GirisTarih"],
                                Dogum = reader["DogumTarih"],
                                Tel = reader["CepTelefon"]
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
                    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) AS IlkGiris,
                    MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END) AS SonCikis,
                    DATEDIFF(MINUTE,
                        MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END),
                        MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END)
                    ) AS ToplamMesaiDakika
                FROM Pool P
                JOIN Sicil S ON CAST(P.SicilID AS INT) = S.UserID
                GROUP BY S.UserID, S.Ad, S.Soyad, CONVERT(date, P.EventTime)
                HAVING
                    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) IS NOT NULL AND
                    MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END) IS NOT NULL AND
                    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) < MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END)
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

        [HttpGet("mesai/{userId}")]
        public IActionResult GetPersonelMesai(int userId)
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // Sadece istenen personeli getirmesi için WHERE şartı eklendi
                string query = @"
            SELECT
                S.UserID,
                S.Ad,
                S.Soyad,
                B.Ad as 'departman',
                CONVERT(date, P.EventTime) AS Tarih,
                MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) AS IlkGiris,
                MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END) AS SonCikis,
                DATEDIFF(MINUTE,
                    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END),
                    MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END)
                ) AS ToplamMesaiDakika
            FROM Pool P
            JOIN Sicil S ON CAST(P.SicilID AS INT) = S.UserID
            LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
            WHERE S.UserID = @UserId -- DÜZELTME: Bu satır eklendi
            GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
            HAVING
                MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) IS NOT NULL AND
                MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END) IS NOT NULL AND
                MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) < MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END)
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
                                // UserID, Ad, Soyad gibi bilgileri artık tekrar eklemeye gerek yok
                                // çünkü bu bilgiler başlıkta ve detay kutusunda zaten var.
                                // Sadece grafiğin ihtiyaç duyduğu verileri yollamak daha verimli.
                                Tarih = reader["Tarih"],
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"],
                                ToplamMesaiDakika = reader["ToplamMesaiDakika"],
                                departman = reader["departman"]
                            });
                        }
                    }
                }
            }

            return Ok(result);
        }

        // DataController.cs dosyasındaki GetPersoneller metodunu aşağıdakiyle değiştirin.

        // DataController.cs -> GetPersoneller metodu

        // DataController.cs -> GetPersoneller metodu

        [HttpGet("personeller")]
        public IActionResult GetPersoneller()
        {
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // DÜZELTME: Tekrarları önlemek ve performansı artırmak için sorgu WHERE EXISTS ile yeniden yazıldı.
                // DataController.cs -> GetPersoneller metodundaki query değişkeni

                string query = @"
    -- 1. Adım: Her personele ait fotoğrafları numaralandırıp sadece ilkini seçeceğimiz bir CTE oluşturuyoruz.
  WITH SinglePhoto AS (
    SELECT
        sicilid,
        fotoimage,
        ROW_NUMBER() OVER(PARTITION BY sicilid ORDER BY sicilid) AS rn
    FROM
        SicilFoto
)
SELECT
    S.UserID,
    S.Ad,
    S.Soyad,
    B.Ad AS departman,
    SP.fotoimage AS FotoData
FROM
    Sicil S
LEFT JOIN
    cbo_bolum B ON S.Bolum = B.ID
LEFT JOIN
    SinglePhoto SP ON S.UserID = SP.sicilid AND SP.rn = 1;
";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        // ... (Geri kalan C# kodunuzda bir değişiklik yapmanıza gerek yok) ...
                        string ad = reader["Ad"] == DBNull.Value ? null : reader["Ad"].ToString();
                        string soyad = reader["Soyad"] == DBNull.Value ? null : reader["Soyad"].ToString();
                        string departman = reader["departman"] == DBNull.Value ? null : reader["departman"].ToString();

                        string fotoBase64 = null;
                        if (reader["FotoData"] != DBNull.Value)
                        {
                            byte[] fotoBytes = (byte[])reader["FotoData"];
                            fotoBase64 = Convert.ToBase64String(fotoBytes);
                        }

                        result.Add(new
                        {
                            UserID = reader["UserID"],
                            Departman = departman,
                            Ad = ad,
                            Soyad = soyad,
                            FotoBase64 = fotoBase64
                        });
                    }
                }
            }
            return Ok(result);
        }

        // DataController.cs dosyanıza bu yeni metodu ekleyin

        // DataController.cs dosyasındaki ilgili metot

        // DataController.cs dosyasındaki ilgili metot

        // DataController.cs dosyasındaki ilgili metot

        [HttpGet("gunluk-ozet")]
        public IActionResult GetGunlukOzet([FromQuery] DateTime? tarih)
        {
            DateTime sorguTarihi = tarih ?? DateTime.Today;
            var result = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // YENİ: FazlaMesaiDakika sütunu eklendi
                string query = @"
            -- Son çıkış saatini bir CTE içinde hesaplayarak sorguyu basitleştirelim
           WITH CikisZamanlari AS (
    SELECT
        P.SicilID,
        CONVERT(date, P.EventTime) AS Tarih,
        MAX(CASE WHEN P.TerminalID % 2 = 0 THEN P.EventTime END) AS SonCikis
    FROM Pool P
    WHERE CONVERT(date, P.EventTime) = @Tarih
    GROUP BY P.SicilID, CONVERT(date, P.EventTime)
)
SELECT
    S.UserID,
    S.Ad,
    S.Soyad,
    B.Ad as 'departman',
    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) AS IlkGiris,
    CZ.SonCikis,
    
    -- === DÜZELTİLMİŞ FAZLA MESAİ HESAPLAMA MANTIĞI ===
    CASE
        -- DÜZELTME: Uyumlu tarih/saat oluşturmak için DATEADD kullanıldı
        WHEN CZ.SonCikis > DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, CZ.SonCikis) AS datetime)))
        THEN DATEDIFF(
            MINUTE,
            -- DÜZELTME: Uyumlu tarih/saat oluşturmak için DATEADD kullanıldı
            DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, CZ.SonCikis) AS datetime))),
            CZ.SonCikis
        )
        ELSE 0
    END AS FazlaMesaiDakika
    
FROM Pool P
JOIN Sicil S ON CAST(P.SicilID AS INT) = S.UserID
LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
JOIN CikisZamanlari CZ ON P.SicilID = CZ.SicilID AND CONVERT(date, P.EventTime) = CZ.Tarih
WHERE CONVERT(date, P.EventTime) = @Tarih
GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CZ.SonCikis
HAVING
    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) IS NOT NULL AND
    CZ.SonCikis IS NOT NULL AND
    MIN(CASE WHEN P.TerminalID % 2 = 1 THEN P.EventTime END) < CZ.SonCikis;
        ";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Tarih", sorguTarihi.Date);

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
                                IlkGiris = reader["IlkGiris"],
                                SonCikis = reader["SonCikis"],
                                // YENİ: Fazla mesai verisini de modele ekle
                                FazlaMesaiDakika = reader["FazlaMesaiDakika"]
                            });
                        }
                    }
                }
            }
            return Ok(result);
        }


        // DataController.cs dosyanıza bu yeni metodu ekleyin

        [HttpGet("aralik-raporu")]
        public IActionResult GetAralikRaporu([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
        {
            var personelOzetleri = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                conn.Open();

                // Bu sorgu, belirtilen tarih aralığındaki her personel için
                // toplam geç kalma sayısını ve toplam fazla mesaiyi hesaplar.
                string query = @"
            -- 1. Her bir gün için giriş, çıkış ve durumları hesaplayan bir temel sorgu oluşturalım (CTE).
            WITH GunlukVeriler AS (
                SELECT
                    S.UserID,
                    S.Ad,
                    S.Soyad,
                    B.Ad as 'departman',
                    MIN(P.EventTime) AS IlkGiris,
                    MAX(P.EventTime) AS SonCikis,
                    CASE 
                        WHEN MIN(P.EventTime) > DATEADD(minute, 45, DATEADD(hour, 8, CAST(CONVERT(date, P.EventTime) AS datetime)))
                        THEN 1 ELSE 0 
                    END AS GecKalma,
                    CASE
                        WHEN MAX(P.EventTime) > DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime)))
                        THEN DATEDIFF(MINUTE, DATEADD(minute, 30, DATEADD(hour, 17, CAST(CONVERT(date, P.EventTime) AS datetime))), MAX(P.EventTime))
                        ELSE 0
                    END AS FazlaMesaiDakika
                FROM Pool P
                JOIN Sicil S ON CAST(P.SicilID AS INT) = S.UserID
                LEFT JOIN cbo_bolum B ON S.Bolum = B.ID
                WHERE CONVERT(date, P.EventTime) BETWEEN @Baslangic AND @Bitis
                GROUP BY S.UserID, S.Ad, S.Soyad, B.Ad, CONVERT(date, P.EventTime)
            )
            -- 2. Bu günlük verileri personellere göre gruplayarak özet sonuçları alalım.
            SELECT
                UserID,
                Ad,
                Soyad,
                departman,
                SUM(GecKalma) AS GecKalmaSayisi,
                SUM(FazlaMesaiDakika) AS ToplamFazlaMesaiDakika
            FROM GunlukVeriler
            GROUP BY UserID, Ad, Soyad, departman;
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
                                ToplamFazlaMesaiDakika = reader["ToplamFazlaMesaiDakika"]
                            });
                        }
                    }
                }
            }
            // NOT: "Aralığın En'leri" ve "Departman Analizi" için ayrı sorgular da buraya eklenebilir.
            // Şimdilik bu verileri frontend'de hesaplayacağız.
            return Ok(personelOzetleri);
        }

    }
















}