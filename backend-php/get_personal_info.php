<?php


ini_set('display_errors', 'On');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
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

$matricule = isset($_GET['matricule']) ? trim($_GET['matricule']) : '';

if (empty($matricule)) {
    echo json_encode(['success' => false, 'message' => 'Matricule manquant.']);
    http_response_code(400);
    exit();
}

try {
    // Jointure avec 'occupe' et 'grades' pour récupérer l'intitulé du grade
    // Ajout de p.SoldeCongeAnnuel et p.SoldeCongeAnneePrecedente
    $stmt = $pdo->prepare("
        SELECT
            p.Matricule,
            p.CIN,
            p.Nom,
            p.Prenom,
            p.Adress,
            p.DateN,
            p.LieuN,
            p.SituationF,
            p.NbrEnfant,
            p.Diplome,
            p.DateEmb,
            p.SoldeCongeAnnuel,
            p.SoldeCongeAnneePrecedente, -- Nouvelle colonne ajoutée ici
            g.IntituleG AS Grade
        FROM
            personne p
        LEFT JOIN
            occupe o ON p.Matricule = o.Matricule
        LEFT JOIN
            grades g ON o.IdG = g.IdG
        WHERE
            p.Matricule = :matricule
        ORDER BY
            o.DateEffet DESC
        LIMIT 1
    ");
    $stmt->bindParam(':matricule', $matricule);
    $stmt->execute();
    $personInfo = $stmt->fetch();

    if ($personInfo) {
        echo json_encode(['success' => true, 'data' => $personInfo]);
        http_response_code(200);
    } else {
        // Si la personne est trouvée mais sans grade, ou pas trouvée du tout
        $stmtCheckPersonne = $pdo->prepare("SELECT Matricule, CIN, Nom, Prenom, Adress, DateN, LieuN, SituationF, NbrEnfant, Diplome, DateEmb, SoldeCongeAnnuel, SoldeCongeAnneePrecedente FROM personne WHERE Matricule = :matricule");
        $stmtCheckPersonne->bindParam(':matricule', $matricule);
        $stmtCheckPersonne->execute();
        $personOnlyInfo = $stmtCheckPersonne->fetch();

        if ($personOnlyInfo) {
            $personOnlyInfo['Grade'] = null; // Assurez-vous que le champ Grade est présent même s'il est null
            echo json_encode(['success' => true, 'data' => $personOnlyInfo, 'message' => 'Informations personnelles trouvées, mais aucun grade associé.']);
            http_response_code(200);
        } else {
            echo json_encode(['success' => false, 'message' => 'Informations personnelles non trouvées pour ce matricule.']);
            http_response_code(404);
        }
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur SQL lors de la récupération des informations personnelles: ' . $e->getMessage()]);
    http_response_code(500);
}
?>

