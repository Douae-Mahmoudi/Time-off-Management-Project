<?php
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
$dbname = "conge"; 

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Échec de la connexion à la base de données: " . $conn->connect_error]);
    exit();
}

// Requête SQL pour récupérer toutes les demandes de congé avec les informations de la personne
// y compris le NOM, PRENOM, SOLDE_ANNUEL, SOLDE_ANNEE_PRECEDENTE
// et le ROLE (Grade) via une jointure avec la table 'appartenir'
$sql = "SELECT
            c.IdC,
            c.Matricule,
            c.DateD,
            c.DateF,
            c.NbrJ,
            c.Annee,
            c.Remarque,
            c.Statut,
            c.commentaire_chef,
            p.Nom,
            p.Prenom,
            p.SoldeCongeAnnuel,
            p.SoldeCongeAnneePrecedente,
            a.role AS Grade 
        FROM
            conge c
        JOIN
            personne p ON c.Matricule = p.Matricule
        LEFT JOIN
            appartenir a ON p.Matricule = a.Matricule
        ORDER BY
            c.DateD DESC";

$result = $conn->query($sql);

$conges = [];
if ($result === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL lors de la récupération des congés: " . $conn->error]);
    $conn->close();
    exit();
}

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $conges[] = $row;
    }
    echo json_encode(["success" => true, "data" => $conges]);
} else {
    echo json_encode(["success" => true, "message" => "Aucune demande de congé trouvée.", "data" => []]);
}

$conn->close();
?>

