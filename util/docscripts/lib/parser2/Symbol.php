<?php

require_once('debug.php');

class Symbol {
  public $id = NULL;
  public $name = NULL;
  public $value = NULL;
  public $first = NULL;
  public $second = NULL;
  public $third = NULL;
  public $lbp = 0;
  public $reserved = FALSE;
  public $global_scope = FALSE;
  public $assignment = FALSE;
  public $arity;
  public $type;
  public $line_number;
  public $char_pos;

  public $nud = 'nud_default';
  public $led = 'led_default';
  public $std = NULL;

  public $bp = 0;

  public function is_lookup($statement = NULL) {
    if (!$statement) {
      $statement = $this;
    }

    $first = $statement->first;
    $second = $statement->second;

    if ($first && $statement->arity == 'binary' && ($statement->id == '.' || $statement->id == '[')) {
      return (is_object($first) && $first->is_lookup() && $second->arity == 'literal');
    }
    else {
      return ($statement->arity == 'name' || $statement->arity == 'literal' || $statement->arity == 'this');
    }
  }

  public function resolve($statement = NULL, $public = FALSE, $firsts = array()) {
    if (!$statement) {
      $public = TRUE; // Whether the call is non-resursive
      $statement = $this;
    }

    $first = $statement->first;
    $second = $statement->second;

    if ($first && $statement->arity == 'binary' && ($statement->id == '.' || $statement->id == '[')) {
      // foo.bar.baz or foo["bar"].baz
      list($is_global, $name) = $this->resolve($first, FALSE, $firsts);

      if (!$second->arity == 'literal') {
        throw new Exception(sprintf('Line %d, char %d: Lookup is not by literal: %s', $statement->line_number, $statement->char_pos, $second));
      }

      if (is_object($name) && $name->id == '{') {
        // The parent item resolved to an object
        // so we need to continue the lookup
        foreach ($name->first as $value) {
          // -> first has all values with their key
          if ($value->key == $second->value) {
            if ($value->first() == $statement->first()) {
               // Object references itself, within itself
              continue;
            }
            if ($value->arity == 'name') {
              // Contains an actual variable name
              return array($value->global_scope, $value->value);
            }
            elseif ($value->arity == 'binary' && ($value->id == '.' || $value->id == '[')) {
              // Contains a new variable for us to resolve
              return $this->resolve($value, TRUE, $firsts);
            }
            elseif (!$public && $value->id == '{') {
              // Contains an object
              return array(NULL, $value);
            }
          }
        }

        $name = $statement->value;
      }

      if (!is_string($name)) {
        throw new Exception(sprintf('Line %d, char %d: Parent variable resolution returned an unknown (%s)', $statement->line_number, $statement->char_pos, $statement));
      }

      return array($is_global, sprintf('%s.%s', $name, $second->value));
    }
    elseif ($statement->arity == 'name' || $statement->arity == 'literal' || $statement->arity == 'this') {
      // This is the first item in the variable (e.g. for foo.bar.baz, it would be foo)
      // It only matters if it's an object or an assignment
      if ($assignment = $statement->scope->assigned($statement->value)) {
        if ($assignment->first() != $statement->first() && !in_array($statement->first(), $firsts)) {
          if ($assignment->arity == 'name') {
            return array($assignment->global_scope, $assignment->value);
          }
          elseif ($assignment->arity == 'binary' && ($assignment->id == '.' || $assignment->id == '[')) {
            // Deal with stuff like c = p.constructor;
            // followed by p = c.superclass
            // where they "look each other up"
            $firsts[] = $statement->first();
            return $this->resolve($assignment, TRUE, $firsts);
          }
          elseif (!$public && $assignment->id == '{') {
            return array(NULL, $assignment);
          }
        }
      }

      return array($statement->global_scope, $statement->value);
    }

    throw new Exception(sprintf('Line %d, char %d: Expected a variable in the form foo.bar with %s', $statement->line_number, $statement->char_pos, $statement->id));
  }

  public function first($statement = NULL) {
    if (!$statement) {
      $statement = $this;
    }

    $first = $statement->first;
    $second = $statement->second;

    if ($first && $statement->arity == 'binary' && ($statement->id == '.' || $statement->id == '[')) {
      return $this->first($first);
    }
    elseif ($statement->arity == 'name') {
      return $statement->value;
    }
  }

  /**
   * Creates a symbol with a statement denotation function
   * that reads until it finds an opening {
   */
  public function block($parser) {
    $parser->peek('{');
    $token = $parser->token;
    $parser->advance('{');
    return $token->std($parser);
  }

  public function nud_default($parser) {
    throw new Exception("Syntax error on line {$this->line_number}, character {$this->char_pos} ({$this->id}:'{$this->value}')");
  }

  public function nud_prefix($parser) {
    $this->first = $parser->expression(70);
    return $this;
  }

  public function nud_itself($parser) {
    return $this;
  }

  public function nud_constant($parser) {
    $parser->scope->reserve($this);
    $this->value = $parser->new_symbol($this->id, TRUE)->value;
    $this->arity = 'literal';
    return $this;
  }

  public function led_default($parser, $left) {
    throw new Exception("Unknown operator ({$this->id}:'{$this->value}')");
  }

  public function led_infix($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression($this->bp);
    return $this;
  }

  public function led_infixr($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression($this->bp - 1);
    return $this;
  }

  public function led_assignment($parser, $left) {
    if ($left->id != '.' && $left->id != '[' && $left->arity != 'name') {
      throw new Error('Bad lvalue');
    }
    $this->first = $left;
    $this->second = $parser->expression(9);
    $this->assignment = true;
    $this->arity = 'binary';
    return $this;
  }

  public function __call($method, $args) {
    if ($method == 'lbp') {
      if (is_numeric($this->lbp)) {
        return $this->lbp;
      }
      return call_user_func_array(array($this, $this->lbp), $args);
    }
    if ($method == 'nud') {
      return call_user_func_array(array($this, $this->nud), $args);
    }
    if ($method == 'led') {
      return call_user_func_array(array($this, $this->led), $args);
    }
    if ($method == 'std') {
      return call_user_func_array(array($this, $this->std), $args);
    }
  }

  public function __toString() {
    // debug_backtrace_clean();
    if ($this->id == '(name)' || $this->id == '(literal)') {
      return '(' . substr($this->id, 1, strlen($this->id) - 2) . " {$this->value})";
    }
    $first = is_array($this->first) ? ('[' . implode(', ', $this->first) . ']') : $this->first;
    $second = is_array($this->second) ? ('[' . implode(', ', $this->second) . ']') : $this->second;
    $third = is_array($this->third) ? ('[' . implode(', ', $this->third) . ']') : $this->third;
    $out = array_diff(array($this->id, $first, $second, $third), array(NULL));
    return '(' . implode(' ', $out) . ')';
  }
}