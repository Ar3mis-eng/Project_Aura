<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Set gender for demo teachers by email
        DB::table('users')->where('email', 'johnronan@teacher.com')->update(['gender' => 'male']);
        DB::table('users')->where('email', 'chin.balahim@deped.gov.ph')->update(['gender' => 'female']);
    }

    public function down(): void
    {
        // Revert to null
        DB::table('users')->where('email', 'johnronan@teacher.com')->update(['gender' => null]);
        DB::table('users')->where('email', 'chin.balahim@deped.gov.ph')->update(['gender' => null]);
    }
};
