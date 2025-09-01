<?php
// update_carry_over_balance.php

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

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['matricule']) || !isset($input['solde'])) {
    echo json_encode(["success" => false, "message" => "Données manquantes pour la mise à jour du solde reporté."]);
    http_response_code(400);
    exit();
}

$matricule = $input['matricule'];
$solde = (int)$input['solde']; // Assurez-vous que c'est un entier

// Validation simple
if ($solde < 0) {
    echo json_encode(["success" => false, "message" => "Le solde reporté ne peut pas être négatif."]);
    http_response_code(400);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "conge"; // Assurez-vous que c'est le nom CORRECT de votre base de données

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Échec de la connexion à la base de données: " . $conn->connect_error]);
    http_response_code(500);
    exit();
}

try {
    // Mettre à jour la colonne SoldeCongeAnneePrecedente pour l'employé
    $stmt = $conn->prepare("UPDATE personne SET SoldeCongeAnneePrecedente = ? WHERE Matricule = ?");
    $stmt->bind_param("is", $solde, $matricule); // i pour int, s pour string

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => "Solde de congés reportés mis à jour avec succès!"]);
            http_response_code(200);
        } else {
            echo json_encode(["success" => false, "message" => "Aucun employé trouvé avec ce matricule ou pas de changement effectué."]);
            http_response_code(200);
        }
    } else {
        throw new Exception("Erreur lors de la mise à jour du solde reporté: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Erreur serveur: " . $e->getMessage()]);
    http_response_code(500);
} finally {
    $conn->close();
}
?>
