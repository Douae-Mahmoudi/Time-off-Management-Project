<?php
// get_all_personnel_details.php

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

// Requête SQL pour récupérer toutes les informations de la table 'personne'
// et joindre le rôle (Role) de la table 'appartenir'
// et l'intitulé du grade (IntituleG) de la table 'grades' via 'occupe'
// La sous-requête sélectionne l'entrée 'occupe' la plus récente pour chaque personne
// en se basant sur la colonne 'DateEffet'.
$sql = "SELECT
            p.IdPersonne,
            p.Matricule,
            p.CIN,
            p.Nom,
            p.Prenom,
            p.Adress,
            p.DateN,
            p.LieuN,
            p.SituationF,
            p.NbrEnfant,
            p.Diplome,
            p.DateEmb,
            p.SoldeCongeAnnuel,
            p.SoldeCongeAnneePrecedente,
            p.Remarque,
            a.role AS Role,      -- Le rôle de l'utilisateur (Employé, Chef de service, Directeur)
            g.IntituleG          -- L'intitulé du grade (Ingénieur de grade 3, etc.)
        FROM
            personne p
        LEFT JOIN
            appartenir a ON p.Matricule = a.Matricule
        LEFT JOIN
            (SELECT Matricule, IdG, DateEffet  -- CORRECTION ICI : DateEffet au lieu de DateEffect
             FROM occupe
             WHERE (Matricule, DateEffet) IN (SELECT Matricule, MAX(DateEffet) FROM occupe GROUP BY Matricule) -- CORRECTION ICI : DateEffet
            ) AS o ON p.Matricule = o.Matricule
        LEFT JOIN
            grades g ON o.IdG = g.IdG
        ORDER BY
            p.Nom ASC, p.Prenom ASC";

$result = $conn->query($sql);

if ($result === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL lors de la récupération des détails du personnel: " . $conn->error]);
    $conn->close();
    exit();
}

$personnelList = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $personnelList[] = $row;
    }
    echo json_encode(["success" => true, "data" => $personnelList]);
} else {
    echo json_encode(["success" => true, "data" => [], "message" => "Aucun personnel trouvé."]);
}

$conn->close();
?>
