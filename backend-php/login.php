<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: http://localhost:4200"); // L'origine de votre application Angular
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Gérer la requête OPTIONS (preflight request)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(); // Terminer le script après avoir envoyé les en-têtes CORS pour OPTIONS
}

// Définir le type de contenu de la réponse comme JSON 
header('Content-Type: application/json');

// Configuration de la base de données
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
    http_response_code(500); // Internal Server Error
    exit();
}

// Lire le corps de la requête POST (JSON)
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['User']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Données de connexion invalides (champs manquants ou JSON mal formé).']);
    http_response_code(400); 
    exit();
}

$username = $data['User']; 
$password = $data['password'];

try {
    $stmt = $pdo->prepare("SELECT IdUser, Nom, Prenom, User, password, actif FROM users WHERE User = :username");
    $stmt->bindParam(':username', $username); // Le username est le Matricule
    $stmt->execute();
    $user = $stmt->fetch();

    if (!$user) {
        // Utilisateur non trouvé
        echo json_encode(['success' => false, 'message' => 'Nom d\'utilisateur incorrect.']);
        http_response_code(401); // Unauthorized
        exit();
    }

    if (!password_verify($password, $user['password'])) {
        // Mot de passe incorrect
        echo json_encode(['success' => false, 'message' => 'Mot de passe incorrect.']);
        http_response_code(401); // Unauthorized
        exit();
    }

 
    $defaultIdService = 1; 

    $stmt_role = $pdo->prepare("SELECT Role FROM appartenir WHERE Matricule = :matricule AND IdS = :ids");
    $stmt_role->bindParam(':matricule', $user['User']); 
    $stmt_role->bindParam(':ids', $defaultIdService);
    $stmt_role->execute();
    $role_data = $stmt_role->fetch();
    $role = $role_data ? $role_data['Role'] : null;

    if ($role === null) {
        // Si aucun rôle n'est trouvé, cela peut indiquer un problème de données ou d'affectation
        echo json_encode(['success' => false, 'message' => 'Aucun rôle trouvé pour cet utilisateur dans le service par défaut. Veuillez contacter l\'administrateur.']);
        http_response_code(401);
        exit();
    }

    // Générer un token (simulé, utilisez JWT pour la production)
    $token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiJ' . $user['IdUser'] . 'IiwidXNlciI6Im' . $user['User'] . 'IiwiaWF0IjoxNjc4MzYzNjcwLCJleHAiOjE2NzgzNjcyNzB9.real_mock_jwt_jwt_token_from_php';

    $response_data = [
        'success' => true,
        'message' => 'Connexion réussie.',
        'token' => $token,
        'IdUser' => $user['IdUser'],
        'Nom' => $user['Nom'],
        'prenom' => $user['Prenom'],
        'User' => $user['User'], // Le Matricule
        'actif' => (bool)$user['actif'],
        'role' => $role // AJOUT DU RÔLE À LA RÉPONSE
    ];
    echo json_encode($response_data);
    http_response_code(200); // OK

} catch (PDOException $e) {
    // Erreur lors de l'exécution de la requête SQL
    echo json_encode(['success' => false, 'message' => 'Erreur SQL lors de la connexion: ' . $e->getMessage()]);
    http_response_code(500); // Internal Server Error
} catch (Exception $e) {
    // Autres erreurs inattendues
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue: ' . $e->getMessage()]);
    http_response_code(500);
}
?>

