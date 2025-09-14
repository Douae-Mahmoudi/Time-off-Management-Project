using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure; 
using PdfGeneratorApi.Models; 
using System; // Pour DateTime
using System.Collections.Generic; // Pour List

namespace PdfGeneratorApi.Controllers 
{
    [ApiController]
    [Route("api/[controller]")]
    public class PdfController : ControllerBase
    {
 
        [HttpPost("generate-leave-report")] // Définit l'URL pour cette action (ex: /api/Pdf/generate-leave-report)
        public IActionResult GenerateLeaveReport([FromBody] LeaveReportData data)
        {
            // Vérification basique des données reçues
            if (data == null || data.LeaveDetails == null)
            {
                return BadRequest("Les données du rapport de congés sont invalides.");
            }

            // Création du document PDF en utilisant QuestPDF
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4); // Format de page A4
                    page.Margin(2, Unit.Centimetre); // Marges de 2cm
                    page.PageColor(Colors.White); // Couleur de fond de la page
                    page.DefaultTextStyle(x => x.FontSize(12)); // Taille de police par défaut

                    // En-tête du document
                    page.Header()
                        .Text("Rapport de Congés")
                        .SemiBold().FontSize(24).AlignCenter(); // Titre centré, gras, grande taille

                    // Contenu principal du document
                    page.Content()
                        .PaddingVertical(1, Unit.Centimetre) // Espacement vertical
                        .Column(x =>
                        {
                            x.Spacing(5); // Espacement entre les éléments de la colonne

                            // Informations générales du rapport
                            x.Item().Text($"Date du rapport: {DateTime.Now.ToShortDateString()}");
                            x.Item().Text($"Directeur: {data.DirectorName}"); // Nom du directeur reçu de PHP

                            // Statistiques globales
                            x.Item().PaddingTop(1, Unit.Centimetre).Text("Statistiques Globales").SemiBold();
                            x.Item().Text($"Total des congés approuvés: {data.TotalApprovedLeaves}");
                            x.Item().Text($"Total des congés en attente: {data.TotalPendingLeaves}");

                            // Tableau des détails des congés
                            x.Item().PaddingTop(1, Unit.Centimetre).Text("Détails des Congés").SemiBold();
                            x.Item().Table(table =>
                            {
                                // Définition des colonnes du tableau
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(); // Employé
                                    columns.RelativeColumn(); // Début
                                    columns.RelativeColumn(); // Fin
                                    columns.RelativeColumn(); // Statut
                                    columns.RelativeColumn(); // Remarque (anciennement Type)
                                });

                                // En-tête du tableau
                                table.Header(header =>
                                {
                                    header.Cell().BorderBottom(1).Padding(5).Text("Employé").SemiBold();
                                    header.Cell().BorderBottom(1).Padding(5).Text("Début").SemiBold();
                                    header.Cell().BorderBottom(1).Padding(5).Text("Fin").SemiBold();
                                    header.Cell().BorderBottom(1).Padding(5).Text("Statut").SemiBold();
                                    header.Cell().BorderBottom(1).Padding(5).Text("Remarque").SemiBold(); // En-tête pour la Remarque
                                });

                                // Lignes du tableau (détails de chaque congé)
                                foreach (var leave in data.LeaveDetails)
                                {
                                    table.Cell().BorderBottom(0.5f).Padding(5).Text(leave.EmployeeName);
                                    table.Cell().BorderBottom(0.5f).Padding(5).Text(leave.StartDate.ToShortDateString());
                                    table.Cell().BorderBottom(0.5f).Padding(5).Text(leave.EndDate.ToShortDateString());
                                    table.Cell().BorderBottom(0.5f).Padding(5).Text(leave.Status);
                                    table.Cell().BorderBottom(0.5f).Padding(5).Text(leave.Remark); // Affichage de la Remarque
                                }
                            });
                        });
                    // Pied de page du document (numérotation des pages)
                    page.Footer()
                        .AlignCenter()
                        .Text(x =>
                        {
                            x.Span("Page ");
                            x.CurrentPageNumber();
                            x.Span(" sur ");
                            x.TotalPages();
                        });
                });
            });

            // Génère le document PDF en un tableau de bytes
            byte[] pdfBytes = document.GeneratePdf();

            // Retourne le fichier PDF avec le type de contenu approprié et un nom de fichier
            return File(pdfBytes, "application/pdf", "RapportDeConges.pdf");
        }
    }
}

