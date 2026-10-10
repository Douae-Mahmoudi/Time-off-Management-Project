<?php
ob_start(); 
ini_set('display_errors', 'Off');
error_reporting(E_ALL); 

header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

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
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]);
    http_response_code(500); // Internal Server Error
    exit();
}

$directorName = "Directeur Général"; 
$totalApprovedLeaves = 0;
$totalPendingLeaves = 0;
$leaveDetails = [];

try {
    $stmtStats = $pdo->query("SELECT COUNT(*) AS total, Statut FROM conge GROUP BY Statut");
    while ($row = $stmtStats->fetch()) {
        if (strpos($row['Statut'], 'Approuvé') !== false) {
            $totalApprovedLeaves += $row['total'];
        } elseif (strpos($row['Statut'], 'En attente') !== false) {
            $totalPendingLeaves += $row['total'];
        }
    }

    $stmtDetails = $pdo->query("
        SELECT
            u.Nom,      
            u.Prenom,   
            c.DateD,
            c.DateF,
            c.Statut,
            c.Remarque
        FROM
            conge c
        JOIN
            users u ON c.Matricule = u.User 
        ORDER BY c.DateD DESC
    ");
    $leaveDetails = $stmtDetails->fetchAll();

} catch (PDOException $e) {
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Erreur SQL lors de la récupération des données du rapport: ' . $e->getMessage()]);
    http_response_code(500); // Internal Server Error
    exit();
}

$pdfData = [
    'DirectorName' => $directorName,
    'TotalApprovedLeaves' => $totalApprovedLeaves,
    'TotalPendingLeaves' => $totalPendingLeaves,
    'LeaveDetails' => []
];

foreach ($leaveDetails as $detail) {
    $pdfData['LeaveDetails'][] = [
        'EmployeeName' => $detail['Nom'] . ' ' . $detail['Prenom'],
        'StartDate' => (new DateTime($detail['DateD']))->format('Y-m-d\TH:i:s'), 
        'EndDate' => (new DateTime($detail['DateF']))->format('Y-m-d\TH:i:s'),   
        'Status' => $detail['Statut'],
        'Remark' => $detail['Remarque'] 
    ];
}

$aspNetApiUrl = 'https://localhost:7261/api/Pdf/generate-leave-report'; 

$ch = curl_init($aspNetApiUrl); 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_POST, true); 
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($pdfData)); 
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json', 
    'Accept: application/pdf'         
]);

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);


$response = curl_exec($ch); 
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); 
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE); // Récupère le type de contenu de la réponse
$curlError = curl_error($ch); 
curl_close($ch);

if ($response === false || $httpCode !== 200 || $contentType !== 'application/pdf') {
    ob_clean(); 
    header('Content-Type: application/json'); 
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la génération du PDF par l\'API ASP.NET Core. Veuillez vérifier les logs PHP et ASP.NET Core.',
        'curl_error' => $curlError, 
        'http_code' => $httpCode, 
        'content_type_received' => $contentType, 
        'api_response' => $response 
    ]);
    http_response_code(500); // Internal Server Error
    exit();
}

ob_clean(); 
header('Content-Type: application/pdf'); 
header('Content-Disposition: attachment; filename="RapportDeConges.pdf"'); 
echo $response; 
exit(); 
?>


