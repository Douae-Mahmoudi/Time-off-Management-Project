<?php
// update_conge_status.php

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

if (!isset($input['IdC']) || !isset($input['Statut']) || !array_key_exists('commentaire_chef', $input)) {
    echo json_encode(["success" => false, "message" => "Données manquantes pour la mise à jour du statut de congé. (IdC, Statut, commentaire_chef attendus)"]);
    http_response_code(400);
    exit();
}

$idC = $input['IdC'];
$statut = $input['Statut'];
$commentaireChef = $input['commentaire_chef'];

if (!in_array($statut, ['En attente', 'Approuvé', 'Refusé'])) {
    echo json_encode(["success" => false, "message" => "Statut invalide fourni."]);
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

// Démarrer une transaction pour assurer l'atomicité des opérations
$conn->begin_transaction();

try {
    // 1. Mettre à jour le statut et le commentaire du congé
    $stmt_conge = $conn->prepare("UPDATE conge SET Statut = ?, commentaire_chef = ? WHERE IdC = ?");
    $stmt_conge->bind_param("ssi", $statut, $commentaireChef, $idC);
    $stmt_conge->execute();

    if ($stmt_conge->affected_rows === 0) {
        throw new Exception("Aucune demande de congé trouvée avec cet ID ou pas de changement effectué.");
    }

    // 2. Si le statut est 'Approuvé', déduire les jours du solde de l'employé
    if ($statut === 'Approuvé') {
        // Récupérer le NbrJ du congé et le Matricule de l'employé
        $stmt_get_conge_info = $conn->prepare("SELECT NbrJ, Matricule FROM conge WHERE IdC = ?");
        $stmt_get_conge_info->bind_param("i", $idC);
        $stmt_get_conge_info->execute();
        $result_conge_info = $stmt_get_conge_info->get_result();
        $conge_info = $result_conge_info->fetch_assoc();
        $stmt_get_conge_info->close();

        if (!$conge_info) {
            throw new Exception("Informations de congé introuvables pour la déduction du solde.");
        }

        $nbrJ = $conge_info['NbrJ'];
        $matriculeEmploye = $conge_info['Matricule'];

        // Récupérer le solde actuel de l'employé
        $stmt_get_solde = $conn->prepare("SELECT SoldeCongeAnnuel FROM personne WHERE Matricule = ?");
        $stmt_get_solde->bind_param("s", $matriculeEmploye);
        $stmt_get_solde->execute();
        $result_solde = $stmt_get_solde->get_result();
        $personne_info = $result_solde->fetch_assoc();
        $stmt_get_solde->close();

        if (!$personne_info) {
            throw new Exception("Informations de l'employé introuvables pour la déduction du solde.");
        }

        $currentSolde = $personne_info['SoldeCongeAnnuel'];
        $newSolde = $currentSolde - $nbrJ;

        // Assurer que le solde ne devienne pas négatif (si vous avez cette règle métier)
        $newSolde = max(0, $newSolde);

        // Mettre à jour le solde de l'employé dans la table 'personne'
        $stmt_update_solde = $conn->prepare("UPDATE personne SET SoldeCongeAnnuel = ? WHERE Matricule = ?");
        $stmt_update_solde->bind_param("is", $newSolde, $matriculeEmploye);
        $stmt_update_solde->execute();

        if ($stmt_update_solde->affected_rows === 0) {
            throw new Exception("Échec de la mise à jour du solde de l'employé.");
        }
        $stmt_update_solde->close();
    }

    // Si tout s'est bien passé, valider la transaction
    $conn->commit();
    echo json_encode(["success" => true, "message" => "Statut de congé mis à jour et solde déduit avec succès!"]);
    http_response_code(200);

} catch (Exception $e) {
    // En cas d'erreur, annuler la transaction
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Erreur lors de la mise à jour du statut de congé: " . $e->getMessage()]);
    http_response_code(500);
} finally {
    if (isset($stmt_conge)) $stmt_conge->close();
    $conn->close();
}
?>
