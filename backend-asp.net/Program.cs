using QuestPDF.Infrastructure; // NOUVEL IMPORT N�CESSAIRE POUR LicenseType

var builder = WebApplication.CreateBuilder(args);

// Ajout des services au conteneur.
builder.Services.AddControllers();
// En savoir plus sur la configuration de Swagger/OpenAPI : https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuration CORS (Cross-Origin Resource Sharing)
// Cette politique permet aux requ�tes provenant de votre backend PHP (http://localhost/api)
// et de votre frontend Angular (http://localhost:4200) d'acc�der � cette API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins",
        builder => builder.WithOrigins("http://localhost", "http://localhost:80", "http://localhost/api", "http://localhost:4200")
                         .AllowAnyHeader() // Autorise toutes les en-t�tes (Content-Type, Authorization, etc.)
                         .AllowAnyMethod()); // Autorise toutes les m�thodes HTTP (POST, GET, OPTIONS)
});

var app = builder.Build();

// --- CONFIGURATION DE LA LICENCE QUESTPDF ---
// C'est la ligne cruciale pour r�soudre l'erreur de licence.
// Si votre organisation a un revenu annuel brut sup�rieur � 1M USD,
// une licence commerciale est requise pour l'utilisation en production.
// Pour le d�veloppement et les petites organisations, 'Community' est suffisant.
QuestPDF.Settings.License = LicenseType.Community;
// ------------------------------------------

// Configure le pipeline de requ�tes HTTP.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Active le middleware Swagger pour la documentation de l'API
    app.UseSwaggerUI(); // Active l'interface utilisateur Swagger (UI)
}

app.UseHttpsRedirection(); // Redirige les requ�tes HTTP vers HTTPS

// IMPORTANT : Activez la politique CORS d�finie ci-dessus.
// Doit �tre plac� avant UseAuthorization() et MapControllers().
app.UseCors("AllowSpecificOrigins");

app.UseAuthorization(); // Active le middleware d'autorisation

app.MapControllers(); // Mappe les requ�tes HTTP aux actions des contr�leurs

app.Run(); // Lance l'application
