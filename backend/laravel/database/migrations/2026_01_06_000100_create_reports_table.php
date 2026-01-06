<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 50);
            $table->json('answers');
            $table->enum('status', ['submitted','in_review','resolved','archived'])->default('submitted');
            $table->dateTime('submitted_at')->useCurrent();
            $table->timestamps();

            $table->index('student_id');
            $table->index('status');
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
