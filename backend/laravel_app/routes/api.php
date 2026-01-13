<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ThreadController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\QuestionSetController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\AnalyticsController;

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

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'changePassword']);
        Route::post('/profile/photo', [AuthController::class, 'uploadProfilePhoto']);
        Route::delete('/profile/photo', [AuthController::class, 'deleteProfilePhoto']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    // Reports
    Route::get('/reports', [ReportController::class, 'index']);
    Route::post('/reports', [ReportController::class, 'store']);
    Route::get('/reports/{id}', [ReportController::class, 'show']);
    Route::delete('/reports/{id}', [ReportController::class, 'destroy']);

    // Threads / Messages
    Route::get('/threads', [ThreadController::class, 'index']);
    Route::post('/threads', [ThreadController::class, 'store']);
    Route::get('/threads/{id}', [ThreadController::class, 'show']);

    Route::get('/threads/{id}/messages', [MessageController::class, 'index']);
    Route::post('/threads/{id}/messages', [MessageController::class, 'store']);

    // Question sets
    Route::get('/question-sets', [QuestionSetController::class, 'index']);
    Route::post('/question-sets', [QuestionSetController::class, 'store']);
    Route::put('/question-sets/{id}', [QuestionSetController::class, 'update']);
    Route::delete('/question-sets/{id}', [QuestionSetController::class, 'destroy']);

    // Student management (teacher/admin only)
    Route::get('/students', [StudentController::class, 'index']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::put('/students/{id}', [StudentController::class, 'update']);
    Route::delete('/students/{id}', [StudentController::class, 'destroy']);

    // Teachers list (for students to message)
    Route::get('/teachers', [TeacherController::class, 'index']);

    // Analytics (teacher/admin only)
    Route::get('/analytics', [AnalyticsController::class, 'index']);
});
