<?php
/**
 * Food Comparison API
 * Handles food comparison operations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['triggering']) || !isset($input['safe']) || !is_array($input['triggering']) || !is_array($input['safe'])) {
        throw new Exception('Triggering and safe foods arrays are required');
    }
    
    if (empty($input['triggering']) || empty($input['safe'])) {
        throw new Exception('At least one triggering and one safe food are required');
    }
    
    $db = new Database();
    
    // Get ingredient master list for analysis
    $sql = "SELECT name, aliases, tags, note, risk_level FROM ingredient_master";
    $masterIngredients = $db->fetchAll($sql);
    
    // Process foods and normalize ingredients
    $triggeringFoods = processFoods($input['triggering'], $masterIngredients);
    $safeFoods = processFoods($input['safe'], $masterIngredients);
    
    // Find non-similar ingredients
    $nonSimilarIngredients = findNonSimilarIngredients($triggeringFoods, $safeFoods);
    
    // Build comparison table
    $comparisonTable = buildComparisonTable($triggeringFoods, $safeFoods, $masterIngredients);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'nonSimilarIngredients' => $nonSimilarIngredients,
            'comparisonTable' => $comparisonTable,
            'summary' => [
                'totalIngredients' => count($comparisonTable),
                'nonSimilarCount' => count($nonSimilarIngredients),
                'triggeringFoods' => count($triggeringFoods),
                'safeFoods' => count($safeFoods)
            ]
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

function processFoods($foods, $masterIngredients) {
    $processed = [];
    
    foreach ($foods as $food) {
        if (empty($food['ingredients'])) continue;
        
        $ingredients = array_map('trim', explode(',', $food['ingredients']));
        $ingredients = array_filter($ingredients);
        
        $normalizedIngredients = [];
        foreach ($ingredients as $ingredient) {
            $normalizedIngredients[] = normalizeIngredient($ingredient, $masterIngredients);
        }
        
        $processed[] = [
            'name' => $food['name'],
            'ingredients' => $normalizedIngredients,
            'originalIngredients' => $ingredients
        ];
    }
    
    return $processed;
}

function normalizeIngredient($raw, $masterIngredients) {
    $s = strtolower(trim($raw));
    
    // Remove %, parentheses content, and extra spaces
    $s = preg_replace('/\(.*?\)/', '', $s);
    $s = preg_replace('/\d+%/', '', $s);
    $s = preg_replace('/\s+/', ' ', $s);
    $s = trim($s);
    
    // Try alias mapping
    foreach ($masterIngredients as $m) {
        $aliases = json_decode($m['aliases'], true) ?: [];
        $terms = array_merge([$m['name']], $aliases);
        
        foreach ($terms as $term) {
            if (strpos($s, $term) !== false) {
                return $m['name'];
            }
        }
    }
    
    return $s;
}

function findNonSimilarIngredients($triggeringFoods, $safeFoods) {
    $triggeringIngredients = [];
    $safeIngredients = [];
    
    // Collect all ingredients from triggering foods
    foreach ($triggeringFoods as $food) {
        foreach ($food['ingredients'] as $ingredient) {
            $triggeringIngredients[$ingredient] = true;
        }
    }
    
    // Collect all ingredients from safe foods
    foreach ($safeFoods as $food) {
        foreach ($food['ingredients'] as $ingredient) {
            $safeIngredients[$ingredient] = true;
        }
    }
    
    // Find ingredients that are in triggering but NOT in safe
    $nonSimilar = [];
    foreach (array_keys($triggeringIngredients) as $ingredient) {
        if (!isset($safeIngredients[$ingredient])) {
            $nonSimilar[] = $ingredient;
        }
    }
    
    return $nonSimilar;
}

function buildComparisonTable($triggeringFoods, $safeFoods, $masterIngredients) {
    $allFoods = array_merge($triggeringFoods, $safeFoods);
    $allIngredients = [];
    
    // Collect all unique ingredients
    foreach ($allFoods as $food) {
        foreach ($food['ingredients'] as $ingredient) {
            $allIngredients[$ingredient] = true;
        }
    }
    
    $allIngredients = array_keys($allIngredients);
    sort($allIngredients);
    
    $table = [];
    foreach ($allIngredients as $ingredient) {
        $row = [
            'ingredient' => $ingredient,
            'presence' => [],
            'risk' => getIngredientRisk($ingredient, $masterIngredients),
            'note' => getIngredientNote($ingredient, $masterIngredients)
        ];
        
        // Check presence in each food
        foreach ($allFoods as $food) {
            $row['presence'][$food['name']] = in_array($ingredient, $food['ingredients']);
        }
        
        $table[] = $row;
    }
    
    return $table;
}

function getIngredientRisk($ingredient, $masterIngredients) {
    foreach ($masterIngredients as $m) {
        if ($m['name'] === $ingredient) {
            return $m['risk_level'];
        }
    }
    return 'safe';
}

function getIngredientNote($ingredient, $masterIngredients) {
    foreach ($masterIngredients as $m) {
        if ($m['name'] === $ingredient) {
            return $m['note'];
        }
    }
    return '';
}
?> 