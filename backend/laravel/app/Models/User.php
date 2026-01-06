<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'first_name','middle_name','last_name','birthday','age','address','contact_number','email','password','role'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'birthday' => 'date',
    ];

    public function reports()
    {
        return $this->hasMany(Report::class, 'student_id');
    }

    public function threadsCreated()
    {
        return $this->hasMany(Thread::class, 'created_by');
    }
}
