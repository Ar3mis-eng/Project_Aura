<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\QuestionSet;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $teacher = User::firstOrCreate(
            ['email' => 'teacher@example.com'],
            [
                'first_name' => 'Tina',
                'last_name' => 'Teacher',
                'role' => 'teacher',
                'password' => Hash::make('password'),
            ]
        );

        $student = User::firstOrCreate(
            ['email' => 'student@example.com'],
            [
                'first_name' => 'Sam',
                'last_name' => 'Student',
                'role' => 'student',
                'password' => Hash::make('password'),
            ]
        );

        // Baseline question sets
        $sets = [
            'Physical', 'Verbal', 'Sexual', 'Bullying', 'Other'
        ];
        foreach ($sets as $key) {
            QuestionSet::firstOrCreate(
                ['key' => $key],
                [
                    'title' => $key . ' Abuse',
                    'schema' => [],
                    'created_by' => $teacher->id,
                    'is_active' => true,
                ]
            );
        }
    }
}
