<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->date('birthday')->nullable();
            $table->unsignedTinyInteger('age')->nullable();
            $table->string('address', 255)->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['student','teacher','admin'])->default('student');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
