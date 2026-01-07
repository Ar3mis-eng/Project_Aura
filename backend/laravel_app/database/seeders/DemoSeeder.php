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
            ['email' => 'johnronan@teacher.com'],
            [
                'name' => 'John Ronan',
                'first_name' => 'John',
                'last_name' => 'Ronan',
                'role' => 'teacher',
                'password' => Hash::make('password'),
            ]
        );

        $teacher2 = User::firstOrCreate(
            ['email' => 'marytaylor@teacher.com'],
            [
                'name' => 'Mary Taylor',
                'first_name' => 'Mary',
                'last_name' => 'Taylor',
                'role' => 'teacher',
                'password' => Hash::make('password'),
            ]
        );

        // Populate question sets from client AbuseReport.jsx
        $questionSets = [
            'Physical' => [
                ['id' => 'physical_when', 'q' => 'When did this happen?', 'type' => 'text', 'required' => true],
                ['id' => 'physical_where', 'q' => 'Where did it happen (room/place)?', 'type' => 'text', 'required' => true],
                ['id' => 'physical_who', 'q' => 'Who was involved? (names, roles, relation to you)', 'type' => 'text', 'required' => true],
                ['id' => 'physical_description', 'q' => 'Describe what happened in your own words', 'type' => 'text', 'required' => true],
                ['id' => 'physical_injury', 'q' => 'Were you physically injured?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => true],
                ['id' => 'physical_medical', 'q' => 'Did you seek medical attention?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => true],
                ['id' => 'physical_witnesses', 'q' => 'Were there any witnesses? If so, who?', 'type' => 'text', 'required' => false],
                ['id' => 'physical_evidence', 'q' => 'Do you have any evidence (photos, messages)?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => false],
                ['id' => 'physical_repeat', 'q' => 'Has this happened before?', 'type' => 'choice', 'options' => ['Yes','No','Not sure'], 'required' => true],
                ['id' => 'physical_perpetrator', 'q' => 'Would you want to tell us who did it? (optional — you may skip)', 'type' => 'text', 'required' => false],
            ],
            'Verbal' => [
                ['id' => 'verbal_what', 'q' => 'What was said or done (quote if possible)?', 'type' => 'text', 'required' => true],
                ['id' => 'verbal_who', 'q' => 'Who said it? (name/role)', 'type' => 'text', 'required' => true],
                ['id' => 'verbal_where', 'q' => 'Where did it happen?', 'type' => 'text', 'required' => true],
                ['id' => 'verbal_frequency', 'q' => 'How often does this happen?', 'type' => 'choice', 'options' => ['Once','Occasionally','Frequently'], 'required' => true],
                ['id' => 'verbal_effect', 'q' => 'How did it make you feel or affect you?', 'type' => 'text', 'required' => true],
                ['id' => 'verbal_witnesses', 'q' => 'Were there witnesses or others who heard it?', 'type' => 'text', 'required' => false],
                ['id' => 'verbal_perpetrator', 'q' => 'Would you want to tell us who did it? (optional — you may skip)', 'type' => 'text', 'required' => false],
            ],
            'Sexual' => [
                ['id' => 'sexual_when', 'q' => 'When did this occur (date/time)?', 'type' => 'text', 'required' => true],
                ['id' => 'sexual_where', 'q' => 'Where did it happen?', 'type' => 'text', 'required' => true],
                ['id' => 'sexual_description', 'q' => 'Describe what happened (as much as you are comfortable sharing)', 'type' => 'text', 'required' => true],
                ['id' => 'sexual_consent', 'q' => 'Was there consent?', 'type' => 'choice', 'options' => ['Yes','No','Not sure'], 'required' => true],
                ['id' => 'sexual_force', 'q' => 'Was there any use of force or threats?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => true],
                ['id' => 'sexual_injury', 'q' => 'Were there injuries?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => false],
                ['id' => 'sexual_medical', 'q' => 'Did you seek medical support?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => false],
                ['id' => 'sexual_reported_before', 'q' => 'Have you reported this to anyone else before?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => false],
                ['id' => 'sexual_perpetrator', 'q' => 'Would you want to tell us who did it? (optional — you may skip)', 'type' => 'text', 'required' => false],
            ],
            'Bullying' => [
                ['id' => 'bully_who', 'q' => 'Who is bullying you? (names/roles)', 'type' => 'text', 'required' => true],
                ['id' => 'bully_where', 'q' => 'Where does it happen (classroom, online, etc.)?', 'type' => 'text', 'required' => true],
                ['id' => 'bully_frequency', 'q' => 'How often does it happen?', 'type' => 'choice', 'options' => ['Once','Occasionally','Frequently'], 'required' => true],
                ['id' => 'bully_examples', 'q' => 'Provide short examples (one per line)', 'type' => 'text', 'required' => true],
                ['id' => 'bully_effect', 'q' => 'How has this affected your school life or wellbeing?', 'type' => 'text', 'required' => true],
                ['id' => 'bully_support', 'q' => 'Have you told anyone or asked for help?', 'type' => 'choice', 'options' => ['Yes','No'], 'required' => false],
                ['id' => 'bully_perpetrator', 'q' => 'Would you want to tell us who did it? (optional — you may skip)', 'type' => 'text', 'required' => false],
            ],
            'Other' => [
                ['id' => 'other_describe', 'q' => 'Please describe the issue in as much detail as you can', 'type' => 'text', 'required' => true],
                ['id' => 'other_when', 'q' => 'When did it happen?', 'type' => 'text', 'required' => false],
                ['id' => 'other_where', 'q' => 'Where did it happen?', 'type' => 'text', 'required' => false],
                ['id' => 'other_perpetrator', 'q' => 'Would you want to tell us who did it? (optional — you may skip)', 'type' => 'text', 'required' => false],
            ],
        ];

        foreach ($questionSets as $key => $schema) {
            QuestionSet::updateOrCreate(
                ['key' => $key],
                [
                    'title' => $key . ' Abuse',
                    'schema' => $schema,
                    'created_by' => $teacher->id,
                    'is_active' => true,
                ]
            );
        }
    }
}
