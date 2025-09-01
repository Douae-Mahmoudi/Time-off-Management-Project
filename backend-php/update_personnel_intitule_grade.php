
<?php
// update_personnel_intitule_grade.php

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

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "conge"; // Assurez-vous que c'est le nom CORRECT de votre base de données

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Échec de la connexion à la base de données: " . $conn->connect_error]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['matricule']) || !isset($data['newGradeIntitule'])) {
    echo json_encode(["success" => false, "message" => "Données incomplètes. Matricule et nouvel intitulé de grade sont requis."]);
    $conn->close();
    exit();
}

$matricule = $conn->real_escape_string($data['matricule']);
$newGradeIntitule = $conn->real_escape_string(trim($data['newGradeIntitule'])); // Utiliser trim pour enlever les espaces inutiles

// Vérifier si l'intitulé de grade est vide après trim
if (empty($newGradeIntitule)) {
    echo json_encode(["success" => false, "message" => "L'intitulé du grade ne peut pas être vide."]);
    $conn->close();
    exit();
}

// 1. Tenter de récupérer l'IdG de l'intitulé de grade existant
$sql_get_idg = "SELECT IdG FROM grades WHERE IntituleG = '$newGradeIntitule'";
$result_idg = $conn->query($sql_get_idg);

if ($result_idg === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL lors de la récupération de l'IdG: " . $conn->error]);
    $conn->close();
    exit();
}

$newIdG = null;
if ($result_idg->num_rows > 0) {
    // L'intitulé de grade existe, récupérer son IdG
    $row_idg = $result_idg->fetch_assoc();
    $newIdG = $row_idg['IdG'];
} else {
    // L'intitulé de grade n'existe pas, l'insérer dans la table 'grades'
    $sql_insert_grade = "INSERT INTO grades (IntituleG) VALUES ('$newGradeIntitule')";
    $insert_grade_result = $conn->query($sql_insert_grade);

    if ($insert_grade_result === TRUE) {
        $newIdG = $conn->insert_id; // Récupérer l'ID généré pour le nouveau grade
    } else {
        // Si l'insertion échoue, renvoyer une erreur
        echo json_encode(["success" => false, "message" => "Erreur lors de l'insertion du nouvel intitulé de grade dans 'grades': " . $conn->error]);
        $conn->close();
        exit();
    }
}

// À ce stade, $newIdG contient l'IdG valide (existant ou nouvellement inséré)

// 2. Mettre à jour ou insérer l'entrée dans la table 'occupe'
// On va chercher la dernière entrée par DateEffet pour ce matricule.
$sql_check_current_occupe = "SELECT IdG FROM occupe WHERE Matricule = '$matricule' ORDER BY DateEffet DESC LIMIT 1";
$result_check = $conn->query($sql_check_current_occupe);

if ($result_check === false) {
    echo json_encode(["success" => false, "message" => "Erreur SQL (vérification occupe): " . $conn->error]);
    $conn->close();
    exit();
}

if ($result_check->num_rows > 0) {
    // Une entrée actuelle existe, la mettre à jour
    // Nous mettons à jour l'entrée avec la DateEffet la plus récente.
    $sql_update_occupe = "UPDATE occupe SET IdG = '$newIdG' WHERE Matricule = '$matricule' AND DateEffet = (SELECT MAX_DATE.DateEffet FROM (SELECT MAX(DateEffet) AS DateEffet FROM occupe WHERE Matricule = '$matricule') AS MAX_DATE)";
    $update_result = $conn->query($sql_update_occupe);

    if ($update_result === TRUE) {
        if ($conn->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => "Intitulé du grade mis à jour avec succès pour le matricule $matricule."]);
        } else {
            // Aucune ligne affectée, cela peut signifier que le grade est déjà le même.
            echo json_encode(["success" => true, "message" => "Aucune modification détectée ou grade déjà à jour pour le matricule $matricule."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Erreur lors de la mise à jour de l'intitulé du grade dans 'occupe': " . $conn->error]);
    }
} else {
    // Aucune entrée actuelle trouvée, insérer une nouvelle entrée dans 'occupe'
    // La date d'effet sera la date actuelle.
    $currentDate = date('Y-m-d');
    $sql_insert_occupe = "INSERT INTO occupe (Matricule, IdG, DateEffet) VALUES ('$matricule', '$newIdG', '$currentDate')";
    $insert_result = $conn->query($sql_insert_occupe);

    if ($insert_result === TRUE) {
        echo json_encode(["success" => true, "message" => "Nouvel intitulé de grade assigné avec succès pour le matricule $matricule (aucune entrée existante trouvée pour mise à jour)."]);
    } else {
        echo json_encode(["success" => false, "message" => "Erreur lors de l'insertion du nouvel intitulé de grade dans 'occupe': " . $conn->error]);
    }
}

$conn->close();
?>
