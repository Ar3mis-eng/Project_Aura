<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('thread_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('threads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['thread_id','user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('thread_participants');
    }
};
