<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return view('welcome');
});

// Setup route - run this once to initialize database
Route::get('/setup', function () {
    try {
        // Test database connection
        DB::connection()->getPdo();
        $dbConnected = true;
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Database connection failed: ' . $e->getMessage()
        ], 500);
    }

    try {
        // Run migrations
        Artisan::call('migrate', ['--force' => true]);
        $migrationOutput = Artisan::output();

        return response()->json([
            'status' => 'success',
            'message' => 'Database setup complete',
            'migrations' => $migrationOutput,
            'database_connected' => $dbConnected
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Migration failed: ' . $e->getMessage()
        ], 500);
    }
});
