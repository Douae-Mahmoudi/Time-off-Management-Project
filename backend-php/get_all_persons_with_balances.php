<?php
// get_all_persons_with_balances.php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "conge"; // Assurez-vous que c'est le nom CORRECT de votre base de données

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Échec de la connexion à la base de données: " . $conn->connect_error]);
    exit();
}

// Requête SQL pour récupérer le matricule, nom, prénom, solde annuel, solde reporté
// et le ROLE (Grade) via une jointure avec la table 'appartenir'
$sql = "SELECT
            p.Matricule,
            p.Nom,
            p.Prenom,
            p.SoldeCongeAnnuel,
            p.SoldeCongeAnneePrecedente,
            a.role AS Grade -- Sélectionne 'role' de la table 'appartenir' et l'alias 'Grade'
        FROM
            personne p
        LEFT JOIN
            appartenir a ON p.Matricule = a.Matricule";

$result = $conn->query($sql);

if ($result === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL lors de la récupération des informations des personnes: " . $conn->error]);
    $conn->close();
    exit();
}

$persons = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $persons[] = [
            "Matricule" => $row["Matricule"],
            "Nom" => $row["Nom"],
            "Prenom" => $row["Prenom"],
            "SoldeCongeAnnuel" => (int)$row["SoldeCongeAnnuel"], // Cast en int pour s'assurer du type
            "SoldeCongeAnneePrecedente" => (int)$row["SoldeCongeAnneePrecedente"], // Cast en int
            "Grade" => $row["Grade"] // Le grade est maintenant correctement récupéré
        ];
    }
    echo json_encode(["success" => true, "data" => $persons]);
} else {
    echo json_encode(["success" => true, "data" => [], "message" => "Aucune personne trouvée."]);
}

$conn->close();
?>
