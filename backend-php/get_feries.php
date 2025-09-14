<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dbHost = 'localhost';
$dbName = 'conge';
$dbUser = 'root';
$dbPass = '';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]);
    http_response_code(500);
    exit();
}

try {
    // Récupère tous les jours fériés de la table 'Ferie'
    $stmt = $pdo->prepare("SELECT IdF, IntituleF, DateDeb, nbrJ, annee, remarque FROM Ferie ORDER BY DateDeb ASC");
    $stmt->execute();
    $feries = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $feries]);
    http_response_code(200);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur SQL lors de la récupération des jours fériés: ' . $e->getMessage()]);
    http_response_code(500);
}
?>

