// Models/LeaveReportData.cs
using System;
using System.Collections.Generic;

namespace PdfGeneratorApi.Models // Assurez-vous que le namespace correspond au nom de votre projet
{
    // Cette classe représente les données globales du rapport
    public class LeaveReportData
    {
        public string DirectorName { get; set; }
        public int TotalApprovedLeaves { get; set; }
        public int TotalPendingLeaves { get; set; }
        public List<LeaveDetail> LeaveDetails { get; set; } = new List<LeaveDetail>();
    }

    // Cette classe représente les détails d'une demande de congé pour le rapport
    // Elle est adaptée aux colonnes de votre table 'conge'
    public class LeaveDetail
    {
        public string EmployeeName { get; set; } // Nom complet de l'employé (Nom + Prénom)
        public DateTime StartDate { get; set; } // Correspond à la colonne 'DateD' en PHP
        public DateTime EndDate { get; set; }   // Correspond à la colonne 'DateF' en PHP
        public string Status { get; set; }      // Correspond à la colonne 'Statut' en PHP
        public string Remark { get; set; }      // Correspond à la colonne 'Remarque' en PHP (utilisée pour décrire le type/raison du congé)
    }
}
