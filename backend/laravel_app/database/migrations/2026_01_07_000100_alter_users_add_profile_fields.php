<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->date('birthday')->nullable();
            $table->unsignedInteger('age')->nullable();
            $table->string('address')->nullable();
            $table->string('contact_number')->nullable();
            $table->enum('role', ['student','teacher','admin'])->default('student');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name','middle_name','last_name','birthday','age','address','contact_number','role']);
        });
    }
};
