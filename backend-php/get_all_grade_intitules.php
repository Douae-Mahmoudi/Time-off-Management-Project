<?php
// get_all_grade_intitules.php

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

$sql = "SELECT IntituleG FROM grades ORDER BY IntituleG ASC";
$result = $conn->query($sql);

if ($result === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL lors de la récupération des intitulés de grade: " . $conn->error]);
    $conn->close();
    exit();
}

$gradeIntitules = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $gradeIntitules[] = $row;
    }
    echo json_encode(["success" => true, "data" => $gradeIntitules]);
} else {
    echo json_encode(["success" => true, "data" => [], "message" => "Aucun intitulé de grade trouvé."]);
}

$conn->close();
?>
