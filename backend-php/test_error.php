<?php
// test_error.php - Fichier de test pour forcer l'affichage des erreurs PHP

// Active l'affichage de TOUTES les erreurs PHP
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Cette ligne va provoquer une erreur car la variable n'existe pas
echo $variable_qui_n_existe_pas;

// Pour être sûr qu'il n'y a rien après la balise de fermeture
?>