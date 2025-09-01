<?php
// login.php

// TRÈS IMPORTANT : Assurez-vous qu'il n'y a AUCUN espace, AUCUN saut de ligne, AUCUN caractère
// avant la balise <?php. Le fichier doit commencer exactement par <?php

// --- FORCER L'AFFICHAGE DES ERREURS POUR LE DÉBOGAGE (à commenter en production) ---
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// --- 1. Gestion des CORS ---
header("Access-Control-Allow-Origin: http://localhost:4200"); // L'origine de votre application Angular
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Gérer la requête OPTIONS (preflight request)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(); // Terminer le script après avoir envoyé les en-têtes CORS pour OPTIONS
}

// --- 2. Définir le type de contenu de la réponse comme JSON ---
header('Content-Type: application/json');

// --- 3. Configuration de la base de données ---
$dbHost = 'localhost';
$dbName = 'conge'; // Le nom de la base de données
$dbUser = 'root';
$dbPass = ''; // Mot de passe MySQL

// --- 4. Connexion à la base de données avec PDO ---
try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]);
    http_response_code(500); // Internal Server Error
    exit();
}

// --- 5. Lire le corps de la requête POST (JSON) ---
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Vérifier si les données sont valides et complètes
if (json_last_error() !== JSON_ERROR_NONE || !isset($data['User']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Données de connexion invalides (champs manquants ou JSON mal formé).']);
    http_response_code(400); // Bad Request
    exit();
}

$username = $data['User']; // C'est le Matricule envoyé par Angular
$password = $data['password'];

// --- 6. Vérification des identifiants dans la table 'users' ---
try {
    // Sélectionne les informations de l'utilisateur depuis la table 'users'
    // La colonne 'User' dans 'users' est utilisée pour l'authentification (contient le Matricule).
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

    // Identifiants corrects à ce stade

    // --- Récupérer le rôle de l'utilisateur depuis la table 'appartenir' ---
    // On utilise le 'User' de la table 'users' (qui est le Matricule)
    // et un IdS par défaut (ex: IdS = 1) pour trouver le rôle.
    $defaultIdService = 1; // <--- IMPORTANT : Utilisez le même IdS que celui utilisé à l'inscription

    $stmt_role = $pdo->prepare("SELECT Role FROM appartenir WHERE Matricule = :matricule AND IdS = :ids");
    $stmt_role->bindParam(':matricule', $user['User']); // Utilise le 'User' (Matricule) de la table users
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
