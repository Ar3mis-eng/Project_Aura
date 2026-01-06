<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ThreadController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\QuestionSetController;
use App\Http\Controllers\StudentController;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
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
});
