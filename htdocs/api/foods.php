<?php
require_once __DIR__ . '/../lib/db.php';
$db = new DB();
$db->init();
header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
if($method === 'GET'){
    echo json_encode($db->allFoods());
} elseif($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if(!isset($data['name']) || !isset($data['ingredients'])){
        http_response_code(400);
        echo json_encode(['error'=>'name and ingredients required']);
        exit;
    }
    $db->addFood($data['name'], $data['ingredients']);
    echo json_encode(['status'=>'ok']);
} else {
    http_response_code(405);
}
?>
