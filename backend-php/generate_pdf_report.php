<?php




ob_start(); // Active la mise en mémoire tampon de sortie pour gérer les en-têtes HTTP

// Désactive l'affichage des erreurs pour la production, mais les logue
ini_set('display_errors', 'Off');
error_reporting(E_ALL); // Les erreurs seront toujours journalisées dans les logs du serveur

// --- 1. Gestion des CORS pour permettre les requêtes depuis Angular ---
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Gère les requêtes OPTIONS (preflight requests) envoyées par les navigateurs pour le CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- 2. Configuration de la base de données MySQL ---
$dbHost = 'localhost';
$dbName = 'conge'; // Assurez-vous que c'est bien 'conge' (sans accent)
$dbUser = 'root';
$dbPass = '';

try {
    // Tente de se connecter à la base de données en utilisant PDO
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); // PDO lancera des exceptions en cas d'erreur
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); // Les résultats seront des tableaux associatifs
} catch (PDOException $e) {
    // En cas d'échec de connexion, nettoie le tampon et renvoie une erreur JSON
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]);
    http_response_code(500); // Internal Server Error
    exit();
}

// --- 3. Récupérer les données de la base de données MySQL pour le rapport ---
// Ces données seront ensuite envoyées à l'API ASP.NET Core pour la génération du PDF
$directorName = "Directeur Général"; // Ce nom peut être rendu dynamique (ex: récupéré de la session de l'utilisateur connecté)
$totalApprovedLeaves = 0;
$totalPendingLeaves = 0;
$leaveDetails = [];

try {
    // Requête pour les statistiques globales des congés
    // Utilise la table 'conge' et la colonne 'Statut'
    $stmtStats = $pdo->query("SELECT COUNT(*) AS total, Statut FROM conge GROUP BY Statut");
    while ($row = $stmtStats->fetch()) {
        // Adaptez les conditions de statut si vos valeurs d'ENUM sont différentes (ex: 'Approuvé', 'Refusé', 'En attente')
        if (strpos($row['Statut'], 'Approuvé') !== false) {
            $totalApprovedLeaves += $row['total'];
        } elseif (strpos($row['Statut'], 'En attente') !== false) {
            $totalPendingLeaves += $row['total'];
        }
    }

    // Requête pour les détails de toutes les demandes de congé
    // Jointure entre 'conge' et 'users' pour obtenir le Nom et Prénom de l'employé
    $stmtDetails = $pdo->query("
        SELECT
            u.Nom,      -- Sélectionné directement depuis la table users
            u.Prenom,   -- Sélectionné directement depuis la table users
            c.DateD,
            c.DateF,
            c.Statut,
            c.Remarque
        FROM
            conge c
        JOIN
            users u ON c.Matricule = u.User -- Jointure corrigée : conge.Matricule = users.User
        ORDER BY c.DateD DESC
    ");
    $leaveDetails = $stmtDetails->fetchAll();

} catch (PDOException $e) {
    // En cas d'erreur SQL lors de la récupération des données, nettoie le tampon et renvoie une erreur JSON
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Erreur SQL lors de la récupération des données du rapport: ' . $e->getMessage()]);
    http_response_code(500); // Internal Server Error
    exit();
}

// Préparer les données au format JSON attendu par l'API ASP.NET Core
// Les noms des clés ici doivent correspondre aux propriétés du modèle C# 'LeaveReportData' et 'LeaveDetail'
$pdfData = [
    'DirectorName' => $directorName,
    'TotalApprovedLeaves' => $totalApprovedLeaves,
    'TotalPendingLeaves' => $totalPendingLeaves,
    'LeaveDetails' => []
];

foreach ($leaveDetails as $detail) {
    $pdfData['LeaveDetails'][] = [
        'EmployeeName' => $detail['Nom'] . ' ' . $detail['Prenom'],
        'StartDate' => (new DateTime($detail['DateD']))->format('Y-m-d\TH:i:s'), // Format ISO 8601 requis par C# DateTime
        'EndDate' => (new DateTime($detail['DateF']))->format('Y-m-d\TH:i:s'),   // Format ISO 8601 requis par C# DateTime
        'Status' => $detail['Statut'],
        'Remark' => $detail['Remarque'] // Utilise la colonne 'Remarque' comme description du congé
    ];
}

// --- 4. Envoyer les données préparées à l'API ASP.NET Core et récupérer le PDF ---
// CORRECTION ICI : L'URL est mise à jour pour correspondre à celle où votre API écoute
$aspNetApiUrl = 'https://localhost:7261/api/Pdf/generate-leave-report'; // <--- URL CORRIGÉE

$ch = curl_init($aspNetApiUrl); // Initialise une session cURL
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Retourne la réponse sous forme de chaîne au lieu de l'afficher directement
curl_setopt($ch, CURLOPT_POST, true); // Définit la requête comme POST
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($pdfData)); // Attache les données JSON au corps de la requête POST
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json', // Indique que le corps de la requête est du JSON
    'Accept: application/pdf'         // Indique que nous attendons un PDF en retour
]);

// Si vous utilisez HTTPS avec localhost, vous pourriez avoir besoin de désactiver la vérification SSL
// C'est UNIQUEMENT pour le développement local et NE DOIT PAS être fait en production.
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);


$response = curl_exec($ch); // Exécute la requête cURL
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Récupère le code de statut HTTP de la réponse
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE); // Récupère le type de contenu de la réponse
$curlError = curl_error($ch); // Récupère l'erreur cURL s'il y en a
curl_close($ch); // Ferme la session cURL

// Vérifier si la requête à l'API ASP.NET Core a réussi et a renvoyé un PDF
if ($response === false || $httpCode !== 200 || $contentType !== 'application/pdf') {
    ob_clean(); // Nettoie le tampon de sortie avant d'envoyer une réponse d'erreur
    header('Content-Type: application/json'); // En cas d'erreur, on renvoie du JSON à Angular
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la génération du PDF par l\'API ASP.NET Core. Veuillez vérifier les logs PHP et ASP.NET Core.',
        'curl_error' => $curlError, // Message d'erreur cURL
        'http_code' => $httpCode, // Code HTTP reçu de l'API ASP.NET Core
        'content_type_received' => $contentType, // Type de contenu reçu
        'api_response' => $response // Réponse brute de l'API ASP.NET Core (peut contenir un JSON d'erreur)
    ]);
    http_response_code(500); // Internal Server Error
    exit();
}

// --- 5. Renvoyer le PDF reçu de l'API ASP.NET Core directement à Angular ---
ob_clean(); // Nettoie le tampon de sortie pour s'assurer qu'aucun contenu indésirable n'est envoyé avant le PDF
header('Content-Type: application/pdf'); // Indique au navigateur que la réponse est un PDF
header('Content-Disposition: attachment; filename="RapportDeConges.pdf"'); // Force le téléchargement du fichier avec un nom spécifique
echo $response; // Le contenu binaire du PDF
exit(); // Termine l'exécution du script
?>
