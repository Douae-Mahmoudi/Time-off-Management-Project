<?php
// register.php

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
$dbName = 'conge'; // Nom de la base de données
$dbUser = 'root';
$dbPass = ''; // Mot de passe MySQL

// --- 4. Connexion à la base de données avec PDO ---
try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]);
    http_response_code(500);
    exit();
}

// --- 5. Lire le corps de la requête POST (JSON) ---
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE ||
    !isset($data['Matricule']) || !isset($data['CIN']) ||
    !isset($data['Nom']) || !isset($data['Prenom']) ||
    !isset($data['password']) || !isset($data['Role'])) {
    echo json_encode(['success' => false, 'message' => 'Données d\'inscription invalides. Tous les champs obligatoires doivent être fournis (y compris le rôle).']);
    http_response_code(400);
    exit();
}

$matricule = trim($data['Matricule']);
$cin = trim($data['CIN']);
$nom = trim($data['Nom']);
$prenom = trim($data['Prenom']);
$diplome = isset($data['Diplome']) ? trim($data['Diplome']) : null;
$password_clair = $data['password'];
$role = trim($data['Role']);

// L'identifiant de connexion (User) dans la table 'users' sera le Matricule
$username_for_login = $matricule;

// --- 6. Vérifications avant insertion ---
try {
    $pdo->beginTransaction();

    // Vérifie si le Matricule existe déjà dans la table 'Personne'
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Personne WHERE Matricule = :matricule");
    $stmt->bindParam(':matricule', $matricule);
    $stmt->execute();
    if ($stmt->fetchColumn() > 0) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Ce Matricule est déjà enregistré dans la table Personne.']);
        http_response_code(409);
        exit();
    }

    // Vérifie si la CIN existe déjà dans la table 'Personne'
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM Personne WHERE CIN = :cin");
    $stmt->bindParam(':cin', $cin);
    $stmt->execute();
    if ($stmt->fetchColumn() > 0) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Cette CIN est déjà enregistrée dans la table Personne.']);
        http_response_code(409);
        exit();
    }

    // Vérifie si le Matricule (qui est 'User' dans 'users') existe déjà dans la table 'users'
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE User = :username");
    $stmt->bindParam(':username', $username_for_login); // C'est le Matricule
    $stmt->execute();
    if ($stmt->fetchColumn() > 0) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Un utilisateur avec ce Matricule existe déjà dans la table Users.']);
        http_response_code(409);
        exit();
    }

    // --- 7. Hasher le mot de passe ---
    $hashed_password = password_hash($password_clair, PASSWORD_BCRYPT);
    if ($hashed_password === false) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Erreur lors du hachage du mot de passe.']);
        http_response_code(500);
        exit();
    }

    // --- 8. Insertion dans la table 'Personne' (STRICTEMENT selon votre image) ---
    // Les colonnes Adress, DateEmb, DateN, LieuN, NbrEnfant, Remarque, SituationF sont nullables ou ont des valeurs par défaut
    // et ne sont pas fournies par le formulaire d'inscription.
    $stmt = $pdo->prepare("INSERT INTO Personne (Matricule, CIN, Nom, Prenom, Diplome) VALUES (:matricule, :cin, :nom, :prenom, :diplome)");
    $stmt->bindParam(':matricule', $matricule);
    $stmt->bindParam(':cin', $cin);
    $stmt->bindParam(':nom', $nom);
    $stmt->bindParam(':prenom', $prenom);
    $stmt->bindParam(':diplome', $diplome);
    $stmt->execute();

    // --- 9. Insertion dans la table 'users' (pour l'authentification) ---
    // La colonne 'User' stocke le Matricule.
    // 'actif' est défini à 1 (true) par défaut.
    $id_user_uuid = uniqid('user_', true); // Génère un ID unique pour IdUser (VARCHAR)
    $stmt = $pdo->prepare("INSERT INTO users (IdUser, Nom, Prenom, User, password, actif) VALUES (:id_user, :nom, :prenom, :username, :password_hash, 1)");
    $stmt->bindParam(':id_user', $id_user_uuid);
    $stmt->bindParam(':nom', $nom);
    $stmt->bindParam(':prenom', $prenom);
    $stmt->bindParam(':username', $username_for_login); // C'est le Matricule
    $stmt->bindParam(':password_hash', $hashed_password);
    $stmt->execute();

    // --- 10. Insertion/Mise à jour dans la table 'appartenir' ---
    // Utilisation de la date actuelle comme 'dateS'
    $currentDate = date('Y-m-d');

    // IMPORTANT : Définissez ici l'IdS par défaut ou la logique d'attribution du service.
    // Pour l'exemple, nous utilisons IdS = 1.
    $defaultIdService = 1; // <--- ADAPTEZ CETTE VALEUR À VOTRE LOGIQUE MÉTIER

    // Vérifier si une entrée existe déjà pour ce Matricule et IdS dans 'appartenir'
    // Si oui, nous devons mettre à jour le rôle et la dateS, pas insérer.
    // Cette logique respecte la PRIMARY KEY (Matricule, IdS) de votre table 'appartenir'.
    $stmt_check_appartenir = $pdo->prepare("SELECT COUNT(*) FROM appartenir WHERE Matricule = :matricule AND IdS = :ids");
    $stmt_check_appartenir->bindParam(':matricule', $matricule);
    $stmt_check_appartenir->bindParam(':ids', $defaultIdService);
    $stmt_check_appartenir->execute();
    $exists_appartenir = $stmt_check_appartenir->fetchColumn() > 0;

    if ($exists_appartenir) {
        // La personne est déjà affectée à ce service (selon Matricule, IdS), on met à jour son rôle et la date
        $stmt_appartenir = $pdo->prepare("UPDATE appartenir SET dateS = :dates, Role = :role WHERE Matricule = :matricule AND IdS = :ids");
        $stmt_appartenir->bindParam(':dates', $currentDate);
        $stmt_appartenir->bindParam(':role', $role);
        $stmt_appartenir->bindParam(':matricule', $matricule);
        $stmt_appartenir->bindParam(':ids', $defaultIdService);
        $stmt_appartenir->execute();
    } else {
        // Nouvelle affectation, on insère
        // dateS et role sont nullables dans votre BDD, mais on les insère ici car ils sont fournis par le formulaire.
        $stmt_appartenir = $pdo->prepare("INSERT INTO appartenir (Matricule, IdS, dateS, Role) VALUES (:matricule, :ids, :dates, :role)");
        $stmt_appartenir->bindParam(':matricule', $matricule);
        $stmt_appartenir->bindParam(':ids', $defaultIdService);
        $stmt_appartenir->bindParam(':dates', $currentDate);
        $stmt_appartenir->bindParam(':role', $role);
        $stmt_appartenir->execute();
    }

    // --- 11. Committer la transaction ---
    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Compte créé avec succès. Vous pouvez maintenant vous connecter.']);
    http_response_code(201); // 201 Created
} catch (PDOException $e) {
    $pdo->rollBack();
    // Gérer spécifiquement les erreurs de doublon pour les clés uniques
    if ($e->getCode() == '23000' && strpos($e->getMessage(), 'Duplicate entry') !== false) {
        $response_message = 'Erreur d\'unicité : un Matricule, CIN ou une affectation existe déjà.';
        http_response_code(409); // Conflict
    } else {
        $response_message = 'Erreur lors de l\'inscription: ' . $e->getMessage();
        http_response_code(500); // Internal Server Error
    }
    echo json_encode(['success' => false, 'message' => $response_message]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue: ' . $e->getMessage()]);
    http_response_code(500);
}
?>
