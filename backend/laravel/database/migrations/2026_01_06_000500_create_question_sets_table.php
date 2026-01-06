<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('question_sets', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('title', 255)->nullable();
            $table->json('schema');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_sets');
    }
};
