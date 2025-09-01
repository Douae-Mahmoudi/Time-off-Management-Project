<?php
// get_conge_stats_by_status.php

ini_set('display_errors', 'On'); // Active l'affichage des erreurs PHP
error_reporting(E_ALL);        // Rapporte toutes les erreurs PHP

header("Access-Control-Allow-Origin: *"); // Permet les requêtes depuis n'importe quel domaine (pour le développement)
header("Access-Control-Allow-Methods: GET, OPTIONS"); // Autorise les méthodes GET et OPTIONS
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Autorise les en-têtes nécessaires
header("Content-Type: application/json"); // Indique que la réponse est au format JSON

// Gérer la requête OPTIONS (pré-vol CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Configuration de la base de données
$servername = "localhost";
$username = "root"; // Votre nom d'utilisateur MySQL
$password = "";     // Votre mot de passe MySQL (vide par défaut pour XAMPP/WAMP)
$dbname = "conge";  // Le nom de votre base de données

// Créer une connexion à la base de données
$conn = new mysqli($servername, $username, $password, $dbname);

// Vérifier la connexion
if ($conn->connect_error) {
    // Si la connexion échoue, renvoyer une erreur JSON
    echo json_encode(["success" => false, "message" => "Échec de la connexion à la base de données: " . $conn->connect_error]);
    exit(); // Arrêter l'exécution du script
}

// Requête SQL pour compter les congés par statut
// Assurez-vous que la colonne 'Statut' existe dans votre table 'conge'
$sql = "SELECT Statut, COUNT(*) AS count FROM conge GROUP BY Statut";

$result = $conn->query($sql);

// Vérifier si la requête SQL a échoué
if ($result === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL lors de la récupération des statistiques: " . $conn->error]);
    $conn->close(); // Fermer la connexion avant de quitter
    exit();
}

$stats = [];
// Initialiser les statuts pour s'assurer qu'ils sont toujours présents, même s'il n'y a pas de demandes
$stats['En attente'] = 0;
$stats['Approuvé'] = 0;
$stats['Refusé'] = 0;

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $stats[$row['Statut']] = (int)$row['count'];
    }
}

echo json_encode(["success" => true, "data" => $stats]);

$conn->close(); // Fermer la connexion à la base de données
?>
