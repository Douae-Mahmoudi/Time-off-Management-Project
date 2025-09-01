using QuestPDF.Infrastructure; // NOUVEL IMPORT NÉCESSAIRE POUR LicenseType

var builder = WebApplication.CreateBuilder(args);

// Ajout des services au conteneur.
builder.Services.AddControllers();
// En savoir plus sur la configuration de Swagger/OpenAPI : https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuration CORS (Cross-Origin Resource Sharing)
// Cette politique permet aux requêtes provenant de votre backend PHP (http://localhost/api)
// et de votre frontend Angular (http://localhost:4200) d'accéder à cette API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins",
        builder => builder.WithOrigins("http://localhost", "http://localhost:80", "http://localhost/api", "http://localhost:4200")
                         .AllowAnyHeader() // Autorise toutes les en-têtes (Content-Type, Authorization, etc.)
                         .AllowAnyMethod()); // Autorise toutes les méthodes HTTP (POST, GET, OPTIONS)
});

var app = builder.Build();

// --- CONFIGURATION DE LA LICENCE QUESTPDF ---
// C'est la ligne cruciale pour résoudre l'erreur de licence.
// Si votre organisation a un revenu annuel brut supérieur à 1M USD,
// une licence commerciale est requise pour l'utilisation en production.
// Pour le développement et les petites organisations, 'Community' est suffisant.
QuestPDF.Settings.License = LicenseType.Community;
// ------------------------------------------

// Configure le pipeline de requêtes HTTP.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Active le middleware Swagger pour la documentation de l'API
    app.UseSwaggerUI(); // Active l'interface utilisateur Swagger (UI)
}

app.UseHttpsRedirection(); // Redirige les requêtes HTTP vers HTTPS

// IMPORTANT : Activez la politique CORS définie ci-dessus.
// Doit être placé avant UseAuthorization() et MapControllers().
app.UseCors("AllowSpecificOrigins");

app.UseAuthorization(); // Active le middleware d'autorisation

app.MapControllers(); // Mappe les requêtes HTTP aux actions des contrôleurs

app.Run(); // Lance l'application
