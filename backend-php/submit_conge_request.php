<?php
// submit_conge_request.php

// TRÈS IMPORTANT : Assurez-vous qu'il n'y a AUCUN espace, AUCUN saut de ligne, AUCUN caractère
// avant la balise <?php. Le fichier doit commencer exactement par <?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *"); // Permet l'accès depuis n'importe quelle origine (pour le développement)
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Gérer les requêtes OPTIONS (pré-vol CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Récupérer les données JSON de la requête
$input = json_decode(file_get_contents('php://input'), true);

// Vérifier si les données nécessaires sont présentes
// Inclure 'Matricule' car c'est maintenant une colonne dans la table 'conge'
if (!isset($input['Matricule']) || !isset($input['DateD']) || !isset($input['DateF']) || !isset($input['NbrJ']) || !isset($input['Annee']) || !isset($input['Remarque'])) {
    echo json_encode(["success" => false, "message" => "Données manquantes pour la soumission du congé."]);
    http_response_code(400); // Bad Request
    exit();
}

$matricule = $input['Matricule'];
$dateD = $input['DateD'];
$dateF = $input['DateF'];
$nbrJ = $input['NbrJ'];
$annee = $input['Annee'];
$remarque = $input['Remarque'];

// Paramètres de connexion à la base de données
$servername = "localhost";
$username = "root"; // Votre nom d'utilisateur de la base de données
$password = "";     // Votre mot de passe de la base de données
$dbname = "conge";  // <--- Assurez-vous que c'est le nom CORRECT de votre base de données

// Créer une connexion
$conn = new mysqli($servername, $username, $password, $dbname);

// Vérifier la connexion
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Échec de la connexion à la base de données: " . $conn->connect_error]);
    http_response_code(500); // Internal Server Error
    exit();
}

// Préparer et exécuter la requête d'insertion
// Inclut maintenant les colonnes Matricule, Statut (par défaut 'En attente') et commentaire_chef (NULL)
// Assurez-vous que l'ordre des colonnes ici correspond à celui de votre table conge si vous avez modifié l'ordre.
$stmt = $conn->prepare("INSERT INTO conge (Matricule, DateD, DateF, NbrJ, Annee, Remarque, Statut, commentaire_chef) VALUES (?, ?, ?, ?, ?, ?, 'En attente', NULL)");

// "sssids" -> s:string, i:integer, d:double
// Matricule (s), DateD (s), DateF (s), NbrJ (i), Annee (i), Remarque (s)
// Note: NbrJ et Annee sont des entiers, donc 'i' pour bind_param.
// Remarque: J'ai corrigé le type pour NbrJ et Annee à 'i' si ce sont des entiers.
// Si votre NbrJ ou Annee sont des doubles, utilisez 'd'.
$stmt->bind_param("sssiis", $matricule, $dateD, $dateF, $nbrJ, $annee, $remarque);


if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Demande de congé soumise avec succès!"]);
    http_response_code(200);
} else {
    echo json_encode(["success" => false, "message" => "Erreur lors de la soumission de la demande de congé: " . $stmt->error]);
    http_response_code(500); // Internal Server Error
}

$stmt->close();
$conn->close();
?>
