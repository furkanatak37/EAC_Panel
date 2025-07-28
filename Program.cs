var builder = WebApplication.CreateBuilder(args);

// Controller ve Swagger servisi
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Swagger dev modda çalışsın
if (app.Environment.IsDevelopment())
{

}

// Statik dosyaları (HTML, CSS, JS) sun
app.UseDefaultFiles(); // index.html gibi varsayılan dosyaları sunmak için
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
