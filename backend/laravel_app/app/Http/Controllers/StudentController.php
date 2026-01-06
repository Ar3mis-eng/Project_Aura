<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!in_array(($user->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $students = User::where('role', 'student')
            ->select('id','first_name','middle_name','last_name','age','birthday','contact_number','address','email','created_at')
            ->orderByDesc('created_at')
            ->paginate(20);
        return response()->json($students);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array(($user->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'age' => 'nullable|integer|min:5|max:120',
            'birthday' => 'nullable|date',
            'contact_number' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
        ]);

        $student = User::create([
            'name' => trim($data['first_name'].' '.$data['last_name']),
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'student',
            'age' => $data['age'] ?? null,
            'birthday' => $data['birthday'] ?? null,
            'contact_number' => $data['contact_number'] ?? null,
            'address' => $data['address'] ?? null,
        ]);

        return response()->json($student->only(['id','first_name','middle_name','last_name','email','age','birthday','contact_number','address']), 201);
    }

    public function update(Request $request, $id)
    {
        $actor = $request->user();
        if (!in_array(($actor->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $student = User::where('role','student')->findOrFail($id);

        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => [
                'required','email', Rule::unique('users','email')->ignore($student->id)
            ],
            'age' => 'nullable|integer|min:5|max:120',
            'birthday' => 'nullable|date',
            'contact_number' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
        ]);

        $student->update([
            'name' => trim($data['first_name'].' '.($data['middle_name'] ? $data['middle_name'].' ' : '').$data['last_name']),
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'age' => $data['age'] ?? null,
            'birthday' => $data['birthday'] ?? null,
            'contact_number' => $data['contact_number'] ?? null,
            'address' => $data['address'] ?? null,
        ]);

        return response()->json($student->only(['id','first_name','middle_name','last_name','email','age','birthday','contact_number','address']), 200);
    }
}
