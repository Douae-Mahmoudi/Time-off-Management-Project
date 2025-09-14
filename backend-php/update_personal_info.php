<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['Matricule']) || !isset($data['CIN']) || !isset($data['Nom']) || !isset($data['Prenom'])) {
    echo json_encode(["success" => false, "message" => "Données incomplètes. Matricule, CIN, Nom et Prenom sont requis."]);
    $conn->close();
    exit();
}

$matricule = $conn->real_escape_string($data['Matricule']);
$cin = $conn->real_escape_string($data['CIN']);
$nom = $conn->real_escape_string($data['Nom']);
$prenom = $conn->real_escape_string($data['Prenom']);
$adress = isset($data['Adress']) ? ($data['Adress'] === '' ? 'NULL' : "'" . $conn->real_escape_string($data['Adress']) . "'") : 'NULL';
$dateN = isset($data['DateN']) ? ($data['DateN'] === '' ? 'NULL' : "'" . $conn->real_escape_string($data['DateN']) . "'") : 'NULL';
$lieuN = isset($data['LieuN']) ? ($data['LieuN'] === '' ? 'NULL' : "'" . $conn->real_escape_string($data['LieuN']) . "'") : 'NULL';
$situationF = isset($data['SituationF']) ? ($data['SituationF'] === '' ? 'NULL' : "'" . $conn->real_escape_string($data['SituationF']) . "'") : 'NULL';
$nbrEnfant = isset($data['NbrEnfant']) ? (is_numeric($data['NbrEnfant']) ? (int)$data['NbrEnfant'] : 'NULL') : 'NULL';
$diplome = isset($data['Diplome']) ? ($data['Diplome'] === '' ? 'NULL' : "'" . $conn->real_escape_string($data['Diplome']) . "'") : 'NULL';


$sql = "UPDATE personne SET
            CIN = '$cin',
            Nom = '$nom',
            Prenom = '$prenom',
            Adress = $adress,
            DateN = $dateN,
            LieuN = $lieuN,
            SituationF = $situationF,
            NbrEnfant = $nbrEnfant,
            Diplome = $diplome
        WHERE Matricule = '$matricule'";

if ($conn->query($sql) === TRUE) {
    if ($conn->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Informations personnelles mises à jour avec succès."]);
    } else {
        // Cela peut arriver si les données soumises sont identiques aux données existantes
        echo json_encode(["success" => true, "message" => "Aucune modification détectée ou matricule non trouvé."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Erreur lors de la mise à jour des informations: " . $conn->error]);
}

$conn->close();
?>

