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
        
        $query = User::where('role', 'student');
        
        // Teachers can only see students they created
        if ($user->role === 'teacher') {
            $query->where('created_by', $user->id);
        }
        // Admins can see all students
        
        $students = $query
            ->select('id','first_name','middle_name','last_name','age','birthday','contact_number','address','email','gender','created_at')
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
            'gender' => 'nullable|in:male,female,other',
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
            'created_by' => $user->id,
            'age' => $data['age'] ?? null,
            'birthday' => $data['birthday'] ?? null,
            'contact_number' => $data['contact_number'] ?? null,
            'address' => $data['address'] ?? null,
            'gender' => $data['gender'] ?? null,
        ]);

        return response()->json($student->only(['id','first_name','middle_name','last_name','email','age','birthday','contact_number','address','gender']), 201);
    }

    public function update(Request $request, $id)
    {
        $actor = $request->user();
        if (!in_array(($actor->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = User::where('role','student');
        
        // Teachers can only update students they created
        if ($actor->role === 'teacher') {
            $query->where('created_by', $actor->id);
        }
        
        $student = $query->findOrFail($id);

        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'gender' => 'nullable|in:male,female,other',
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
            'gender' => $data['gender'] ?? null,
        ]);

        return response()->json($student->only(['id','first_name','middle_name','last_name','email','age','birthday','contact_number','address','gender']), 200);
    }

    public function destroy(Request $request, $id)
    {
        $actor = $request->user();
        if (!in_array(($actor->role ?? 'student'), ['teacher','admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = User::where('role','student');
        
        // Teachers can only delete students they created
        if ($actor->role === 'teacher') {
            $query->where('created_by', $actor->id);
        }
        
        $student = $query->findOrFail($id);
        $student->delete();

        return response()->json(['message' => 'Student deleted successfully'], 200);
    }
}
